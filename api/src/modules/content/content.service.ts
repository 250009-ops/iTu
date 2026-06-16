import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentTestStatus, ContentTestType } from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateContentTestDto } from './dto/update-content-test.dto';
import {
  listeningAudioReady,
  questionCountForTest,
} from './content.utils';

const AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

const PART_KEY = /^part-[1-4]$/;

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  async listTests(type?: ContentTestType) {
    const tests = await this.prisma.contentTest.findMany({
      where: type ? { type } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        status: true,
        version: true,
        durationMin: true,
        updatedAt: true,
        publishedAt: true,
        content: true,
        _count: { select: { mediaAssets: true } },
      },
    });

    return tests.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      type: t.type.toLowerCase(),
      status: t.status.toLowerCase(),
      version: t.version,
      durationMin: t.durationMin,
      updatedAt: t.updatedAt,
      publishedAt: t.publishedAt,
      mediaCount: t._count.mediaAssets,
      questionCount: questionCountForTest(t.type, t.content),
    }));
  }

  async getTest(id: string) {
    const test = await this.prisma.contentTest.findUnique({
      where: { id },
      include: { mediaAssets: { orderBy: { key: 'asc' } } },
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async createTest(
    data: {
      code: string;
      title: string;
      type: ContentTestType;
      content: object;
      answerKey?: object;
      durationMin?: number;
    },
    actorId: string,
  ) {
    const created = await this.prisma.contentTest.create({
      data: {
        code: data.code,
        title: data.title,
        type: data.type,
        content: data.content,
        answerKey: data.answerKey,
        durationMin: data.durationMin ?? 60,
        status: ContentTestStatus.DRAFT,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_CREATE,
      entity: 'content_test',
      entityId: created.id,
      metadata: { code: created.code, type: created.type },
    });

    return created;
  }

  async updateTest(id: string, dto: UpdateContentTestDto, actorId: string) {
    const existing = await this.prisma.contentTest.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Test not found');

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        answerKey: dto.answerKey,
        durationMin: dto.durationMin,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_UPDATE,
      entity: 'content_test',
      entityId: id,
      metadata: { code: updated.code, type: updated.type },
    });

    return updated;
  }

  async publishTest(id: string, actorId: string) {
    const test = await this.prisma.contentTest.findUnique({
      where: { id },
      include: { _count: { select: { mediaAssets: true } } },
    });
    if (!test) throw new NotFoundException('Test not found');

    if (test.type === ContentTestType.LISTENING) {
      if (
        !listeningAudioReady(test.content, test._count.mediaAssets)
      ) {
        throw new BadRequestException(
          'Upload all 4 listening audio parts (or include audioTracks in content) before publishing',
        );
      }
    }

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: {
        status: ContentTestStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_PUBLISH,
      entity: 'content_test',
      entityId: id,
      metadata: { code: updated.code },
    });

    return updated;
  }

  async uploadMedia(
    testId: string,
    key: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    if (!PART_KEY.test(key)) {
      throw new BadRequestException('Media key must be part-1 through part-4');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }
    if (!AUDIO_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Invalid audio type. Use MP3, WAV, or OGG.',
      );
    }

    const test = await this.prisma.contentTest.findUnique({
      where: { id: testId },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (test.type !== ContentTestType.LISTENING) {
      throw new BadRequestException('Media upload is only supported for listening tests');
    }

    const ext = this.extensionForMime(file.mimetype, file.originalname);
    const relativePath = `listening/${testId}/${key}${ext}`;
    const publicUrl = await this.storage.saveBuffer(relativePath, file.buffer);

    const asset = await this.prisma.mediaAsset.upsert({
      where: {
        testId_key: { testId, key },
      },
      create: {
        testId,
        key,
        url: publicUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      update: {
        url: publicUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_MEDIA_UPLOAD,
      entity: 'media_asset',
      entityId: asset.id,
      metadata: { testId, key, url: publicUrl, sizeBytes: file.size },
    });

    return {
      id: asset.id,
      key: asset.key,
      url: asset.url,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
    };
  }

  private extensionForMime(mime: string, originalName: string): string {
    const fromName = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase()
      : '';
    if (fromName && /^\.[a-z0-9]+$/.test(fromName)) return fromName;

    switch (mime) {
      case 'audio/wav':
      case 'audio/x-wav':
        return '.wav';
      case 'audio/ogg':
        return '.ogg';
      case 'audio/mp4':
      case 'audio/x-m4a':
        return '.m4a';
      default:
        return '.mp3';
    }
  }
}
