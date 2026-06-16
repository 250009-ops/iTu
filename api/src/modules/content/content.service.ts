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
  isPlaceholderAnswerKey,
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
const FULL_AUDIO_KEY = 'full-audio';
const MAP_KEY = /^map-[a-zA-Z0-9_-]+$/;

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

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

  async submitForReview(id: string, actorId: string) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.status !== ContentTestStatus.DRAFT) {
      throw new BadRequestException('Only draft tests can be submitted for review');
    }

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: { status: ContentTestStatus.UNDER_REVIEW },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_SUBMIT_REVIEW,
      entity: 'content_test',
      entityId: id,
      metadata: { code: updated.code },
    });

    return updated;
  }

  async revertToDraft(id: string, actorId: string) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.status !== ContentTestStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only tests under review can be reverted to draft');
    }

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: { status: ContentTestStatus.DRAFT },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_UPDATE,
      entity: 'content_test',
      entityId: id,
      metadata: { code: updated.code, revertedToDraft: true },
    });

    return updated;
  }

  async importTest(
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
    const existing = await this.prisma.contentTest.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new BadRequestException('Test code already exists — use a unique code');
    }

    const created = await this.createTest(data, actorId);

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_IMPORT,
      entity: 'content_test',
      entityId: created.id,
      metadata: { code: created.code, type: created.type },
    });

    return created;
  }

  async importAnswerKeyCsv(id: string, csvText: string, actorId: string) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (
      test.type !== ContentTestType.LISTENING &&
      test.type !== ContentTestType.READING
    ) {
      throw new BadRequestException(
        'Answer key import applies to listening/reading only',
      );
    }

    const key: Record<string, string | string[]> = {};
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (/^question/i.test(line) && line.includes(',')) continue;
      const sep = line.includes('\t') ? '\t' : ',';
      const [qRaw, ...rest] = line.split(sep);
      const q = qRaw?.trim().replace(/^Q/i, '');
      const answer = rest.join(sep).trim();
      if (!q || !answer) continue;
      key[q] = answer.includes('|')
        ? answer.split('|').map((s) => s.trim())
        : answer;
    }

    if (Object.keys(key).length === 0) {
      throw new BadRequestException('No valid rows found in CSV');
    }

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: { answerKey: key, version: { increment: 1 } },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_UPDATE,
      entity: 'content_test',
      entityId: id,
      metadata: {
        code: updated.code,
        importedAnswerKeys: Object.keys(key).length,
      },
    });

    return updated;
  }

  async publishTest(id: string, actorId: string) {
    const test = await this.prisma.contentTest.findUnique({
      where: { id },
      include: {
        mediaAssets: { select: { key: true } },
      },
    });
    if (!test) throw new NotFoundException('Test not found');

    if (
      test.status !== ContentTestStatus.DRAFT &&
      test.status !== ContentTestStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        'Only draft or under-review tests can be published',
      );
    }

    if (test.type === ContentTestType.LISTENING) {
      if (!listeningAudioReady(test.content, test.mediaAssets)) {
        throw new BadRequestException(
          'Upload the full listening audio file (or legacy part-1..part-4 tracks) before publishing',
        );
      }
    }

    if (
      test.type === ContentTestType.LISTENING ||
      test.type === ContentTestType.READING
    ) {
      const key = test.answerKey as Record<string, string | string[]> | null;
      if (isPlaceholderAnswerKey(key)) {
        throw new BadRequestException(
          'Replace placeholder answer keys with real answers before publishing',
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

  async cloneTest(id: string, code: string, title: string, actorId: string) {
    const source = await this.prisma.contentTest.findUnique({
      where: { id },
    });
    if (!source) throw new NotFoundException('Test not found');

    const existing = await this.prisma.contentTest.findUnique({
      where: { code },
    });
    if (existing) {
      throw new BadRequestException('Test code already exists');
    }

    const cloned = await this.prisma.contentTest.create({
      data: {
        code,
        title,
        type: source.type,
        content: source.content as object,
        answerKey: source.answerKey as object | undefined,
        durationMin: source.durationMin,
        status: ContentTestStatus.DRAFT,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_CREATE,
      entity: 'content_test',
      entityId: cloned.id,
      metadata: { code: cloned.code, clonedFrom: source.code },
    });

    return cloned;
  }

  async uploadMedia(
    testId: string,
    key: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    const isAudio = PART_KEY.test(key) || key === FULL_AUDIO_KEY;
    const isMap = MAP_KEY.test(key);

    if (!isAudio && !isMap) {
      throw new BadRequestException(
        'Media key must be full-audio, part-1..part-4 (legacy audio), or map-{id} (image)',
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }

    const test = await this.prisma.contentTest.findUnique({
      where: { id: testId },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (test.type !== ContentTestType.LISTENING) {
      throw new BadRequestException(
        'Media upload is only supported for listening tests',
      );
    }

    if (isAudio && !AUDIO_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Invalid audio type. Use MP3, WAV, or OGG.',
      );
    }
    if (isMap && !IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Invalid image type. Use JPEG, PNG, or WebP.',
      );
    }

    const ext = this.extensionForMime(file.mimetype, file.originalname, isMap);
    const folder = isMap ? 'maps' : 'listening';
    const relativePath = `${folder}/${testId}/${key}${ext}`;
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

    if (key === FULL_AUDIO_KEY) {
      await this.prisma.mediaAsset.deleteMany({
        where: {
          testId,
          key: { in: ['part-1', 'part-2', 'part-3', 'part-4'] },
        },
      });
    }

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

  private extensionForMime(
    mime: string,
    originalName: string,
    isImage = false,
  ): string {
    const fromName = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase()
      : '';
    if (fromName && /^\.[a-z0-9]+$/.test(fromName)) return fromName;

    if (isImage) {
      switch (mime) {
        case 'image/png':
          return '.png';
        case 'image/webp':
          return '.webp';
        case 'image/gif':
          return '.gif';
        default:
          return '.jpg';
      }
    }

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
