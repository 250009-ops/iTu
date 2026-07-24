import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ContentTestStatus, ContentTestType } from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import {
  isUniqueConstraintError,
  withUniqueRetry,
} from '../../common/id-allocation';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateContentTestDto } from './dto/update-content-test.dto';
import {
  isPlaceholderAnswerKey,
  listeningAudioReady,
  questionCountForTest,
  writingTask1ImageReady,
  WRITING_TASK1_IMAGE_KEY,
} from './content.utils';
import {
  findContentStructureErrors,
  normalizeContentForType,
} from './content-normalize';
import {
  findContentTestPackageAssignments,
  groupAssignmentsByTestId,
  summarizeAssignmentsForTest,
} from './content-package-assignments';
import {
  isValidTestCode,
  isValidInstitutionTestCode,
  nextTestIdentity,
  nextInstitutionTestIdentity,
  syncContentTestId,
} from './content-test-naming';
import {
  assertScopeMatch,
  ContentScope,
  PLATFORM_CONTENT_SCOPE,
  scopeWhere,
} from './content-scope';
import { Prisma } from '@prisma/client';

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
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  async listTests(
    type?: ContentTestType,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const tests = await this.prisma.contentTest.findMany({
      where: {
        ...scopeWhere(scope),
        ...(type ? { type } : {}),
      },
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

    const testIds = tests.map((t) => t.id);
    const [createAudits, allAssignments] = await Promise.all([
      testIds.length
        ? this.prisma.auditLog.findMany({
            where: {
              entity: 'content_test',
              action: AuditAction.CONTENT_TEST_CREATE,
              entityId: { in: testIds },
            },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      testIds.length
        ? findContentTestPackageAssignments(this.prisma, testIds)
        : Promise.resolve([]),
    ]);

    const authorByTest = new Map<string, string>();
    for (const row of createAudits) {
      if (row.entityId && !authorByTest.has(row.entityId)) {
        authorByTest.set(row.entityId, row.user?.name ?? 'Admin');
      }
    }

    const assignmentsByTestId = groupAssignmentsByTestId(allAssignments);

    return tests.map((t) => {
      const summary = summarizeAssignmentsForTest(
        assignmentsByTestId.get(t.id) ?? [],
      );
      return {
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
      authorName: authorByTest.get(t.id) ?? 'Admin',
      linkedPackages: summary.linkedPackages,
      activePackageLinks: summary.activePackageLinks,
      assignedMockLabel: summary.assignedMockLabel,
      assignedMockLabels: summary.assignedMockLabels,
    };
    });
  }

  async getTest(id: string, scope: ContentScope = PLATFORM_CONTENT_SCOPE) {
    const test = await this.prisma.contentTest.findUnique({
      where: { id },
      include: { mediaAssets: { orderBy: { key: 'asc' } } },
    });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);
    return test;
  }

  async suggestNextTestIdentity(
    type: ContentTestType,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    return this.allocateNextTestIdentity(type, scope);
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
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
    auditAction: string = AuditAction.CONTENT_TEST_CREATE,
  ) {
    const code = data.code.trim().toUpperCase();
    const title = data.title.trim();
    await this.assertValidTestCodeForScope(code, scope);

    const existing = await this.prisma.contentTest.findUnique({
      where: { code },
    });
    if (existing) {
      throw new BadRequestException('Test code already exists');
    }

    const content = syncContentTestId(data.content, code) as object;

    let created;
    try {
      created = await this.prisma.contentTest.create({
        data: {
          code,
          title,
          type: data.type,
          content,
          answerKey: data.answerKey,
          durationMin: data.durationMin ?? 60,
          status: ContentTestStatus.DRAFT,
          institutionId: scope.institutionId,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException('Test code already exists');
      }
      throw error;
    }

    await this.audit.log({
      userId: actorId,
      action: auditAction,
      entity: 'content_test',
      entityId: created.id,
      metadata: {
        code: created.code,
        type: created.type,
        institutionId: scope.institutionId,
      },
    });

    return created;
  }

  async updateTest(
    id: string,
    dto: UpdateContentTestDto,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
    auditAction: string = AuditAction.CONTENT_TEST_UPDATE,
  ) {
    const existing = await this.prisma.contentTest.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Test not found');
    assertScopeMatch(existing, scope);

    await this.assertTestEditable(existing.id, existing.status);

    // Repair structural shape on save so we never persist content that can
    // crash the student player (e.g. a question group with non-array `nodes`).
    let normalizedContent: Prisma.InputJsonValue | undefined =
      dto.content !== undefined
        ? (normalizeContentForType(existing.type, dto.content) as Prisma.InputJsonValue)
        : undefined;
    if (normalizedContent !== undefined) {
      normalizedContent = syncContentTestId(
        normalizedContent,
        existing.code,
      ) as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: {
        title: dto.title,
        content: normalizedContent as Prisma.InputJsonValue | undefined,
        answerKey: dto.answerKey,
        durationMin: dto.durationMin,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: actorId,
      action: auditAction,
      entity: 'content_test',
      entityId: id,
      metadata: { code: updated.code, type: updated.type },
    });

    return updated;
  }

  async submitForReview(
    id: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);
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

  async revertToDraft(
    id: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);
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
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const code = data.code.trim().toUpperCase();
    await this.assertValidTestCodeForScope(code, scope);

    const existing = await this.prisma.contentTest.findUnique({
      where: { code },
    });
    if (existing) {
      throw new BadRequestException('Test code already exists — use a unique code');
    }

    const created = await this.createTest({ ...data, code }, actorId, scope);

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_IMPORT,
      entity: 'content_test',
      entityId: created.id,
      metadata: { code: created.code, type: created.type },
    });

    return created;
  }

  async importAnswerKeyCsv(
    id: string,
    csvText: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);
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

  async publishTest(
    id: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
    auditAction: string = AuditAction.CONTENT_TEST_PUBLISH,
  ) {
    const test = await this.prisma.contentTest.findUnique({
      where: { id },
      include: {
        mediaAssets: { select: { key: true } },
      },
    });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);

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

    if (test.type === ContentTestType.WRITING) {
      if (!writingTask1ImageReady(test.content, test.mediaAssets)) {
        throw new BadRequestException(
          'Upload a Task 1 chart/diagram image before publishing (required when a visual type is set)',
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

      const structureErrors = findContentStructureErrors(
        test.type,
        test.content,
      );
      if (structureErrors.length > 0) {
        throw new BadRequestException(
          `Cannot publish — fix malformed question groups: ${structureErrors
            .slice(0, 5)
            .join('; ')}`,
        );
      }
    }

    // Persist a normalized copy so published content is always render-safe.
    const safeContent = normalizeContentForType(
      test.type,
      test.content,
    ) as Prisma.InputJsonValue;

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: {
        content: safeContent,
        status: ContentTestStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: actorId,
      action: auditAction,
      entity: 'content_test',
      entityId: id,
      metadata: { code: updated.code },
    });

    return updated;
  }

  async cloneTest(
    id: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
    auditAction: string = AuditAction.CONTENT_TEST_CREATE,
  ) {
    const source = await this.prisma.contentTest.findUnique({
      where: { id },
      include: { mediaAssets: true },
    });
    if (!source) throw new NotFoundException('Test not found');
    assertScopeMatch(source, scope);

    const cloned = await withUniqueRetry(async () => {
      const identity = await this.allocateNextTestIdentity(source.type, scope);
      const content = syncContentTestId(source.content, identity.code) as object;

      return this.prisma.contentTest.create({
        data: {
          code: identity.code,
          title: identity.title,
          type: source.type,
          content,
          answerKey: source.answerKey as object | undefined,
          durationMin: source.durationMin,
          status: ContentTestStatus.DRAFT,
          institutionId: scope.institutionId,
        },
      });
    });

    await this.copyTestMedia(source.id, cloned.id, source.mediaAssets, scope);

    await this.audit.log({
      userId: actorId,
      action: auditAction,
      entity: 'content_test',
      entityId: cloned.id,
      metadata: { code: cloned.code, clonedFrom: source.code },
    });

    return cloned;
  }

  async archiveTest(
    id: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);

    if (test.status !== ContentTestStatus.PUBLISHED) {
      throw new BadRequestException('Only published tests can be retired.');
    }

    const activeLinks = await this.countActivePackageLinks(id);
    if (activeLinks > 0) {
      throw new BadRequestException(
        `This test is linked to ${activeLinks} active package(s). Assign a replacement in each package before retiring.`,
      );
    }

    const updated = await this.prisma.contentTest.update({
      where: { id },
      data: { status: ContentTestStatus.ARCHIVED },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CONTENT_TEST_ARCHIVE,
      entity: 'content_test',
      entityId: id,
      metadata: { code: updated.code, type: updated.type },
    });

    return updated;
  }

  /**
   * Clone a published test into a new draft, then retire the original when it is
   * not linked to any active package.
   */
  async retireAndDuplicate(
    id: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const test = await this.prisma.contentTest.findUnique({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);

    if (test.status !== ContentTestStatus.PUBLISHED) {
      throw new BadRequestException('Only published tests can be retired.');
    }

    const activeLinks = await this.countActivePackageLinks(id);
    const clone = await this.cloneTest(id, actorId, scope);

    let archived = false;
    if (activeLinks === 0) {
      await this.prisma.contentTest.update({
        where: { id },
        data: { status: ContentTestStatus.ARCHIVED },
      });
      await this.audit.log({
        userId: actorId,
        action: AuditAction.CONTENT_TEST_ARCHIVE,
        entity: 'content_test',
        entityId: id,
        metadata: {
          code: test.code,
          type: test.type,
          retiredViaDuplicate: true,
          cloneId: clone.id,
        },
      });
      archived = true;
    }

    return {
      clone,
      archived,
      activePackageLinks: activeLinks,
    };
  }

  async deleteTest(
    id: string,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
    auditAction: string = AuditAction.CONTENT_TEST_DELETE,
  ) {
    const test = await this.prisma.contentTest.findUnique({
      where: { id },
      include: { mediaAssets: true },
    });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);

    if (test.status === ContentTestStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published tests cannot be deleted. Duplicate the test, assign the copy to your package, then archive the old package.',
      );
    }

    if (test.status === ContentTestStatus.ARCHIVED) {
      throw new BadRequestException(
        'Archived tests cannot be deleted while exam history may reference them.',
      );
    }

    const sectionAttempts = await this.prisma.sectionAttempt.count({
      where: { contentTestId: id },
    });
    if (sectionAttempts > 0) {
      throw new BadRequestException(
        `This test was used in ${sectionAttempts} exam section(s) and cannot be deleted.`,
      );
    }

    const packageLinkCount = await this.countPackageLinks(id);
    if (packageLinkCount > 0) {
      throw new BadRequestException(
        `This test is linked to ${packageLinkCount} package(s). Remove it from each package before deleting.`,
      );
    }

    for (const asset of test.mediaAssets) {
      const relative = this.storage.relativePathFromPublicUrl(asset.url);
      if (relative) {
        await this.storage.deleteFile(relative);
      }
    }

    await this.prisma.mediaAsset.deleteMany({ where: { testId: id } });
    await this.prisma.contentTest.delete({ where: { id } });

    await this.audit.log({
      userId: actorId,
      action: auditAction,
      entity: 'content_test',
      entityId: id,
      metadata: { code: test.code, type: test.type },
    });

    return { deleted: true, id };
  }

  private async copyTestMedia(
    sourceTestId: string,
    targetTestId: string,
    assets: {
      key: string;
      url: string;
      mimeType: string;
      sizeBytes: number | null;
    }[],
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    for (const asset of assets) {
      const relative = this.storage.relativePathFromPublicUrl(asset.url);
      if (!relative) continue;

      const targetRelative = relative.includes(sourceTestId)
        ? relative.replace(sourceTestId, targetTestId)
        : scope.institutionId
          ? relative.replace(
              new RegExp(`institutions/${scope.institutionId}/[^/]+`),
              `institutions/${scope.institutionId}/${targetTestId}`,
            )
          : relative.replace(
              /^(listening|maps|writing)\/[^/]+/,
              `$1/${targetTestId}`,
            );

      try {
        const buffer = await this.storage.readBuffer(relative);
        const newUrl = await this.storage.saveBuffer(targetRelative, buffer);
        await this.prisma.mediaAsset.create({
          data: {
            testId: targetTestId,
            key: asset.key,
            url: newUrl,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
          },
        });
      } catch (err) {
        this.logger.warn(
          `Could not copy media ${asset.key} for test ${targetTestId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  async uploadMedia(
    testId: string,
    key: string,
    file: Express.Multer.File,
    actorId: string,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
    auditAction: string = AuditAction.CONTENT_MEDIA_UPLOAD,
  ) {
    const isAudio = PART_KEY.test(key) || key === FULL_AUDIO_KEY;
    const isMap = MAP_KEY.test(key);
    const isWritingImage = key === WRITING_TASK1_IMAGE_KEY;

    if (!isAudio && !isMap && !isWritingImage) {
      throw new BadRequestException(
        'Media key must be full-audio, part-1..part-4 (legacy audio), map-{id} (image), or task-1-image (writing)',
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }

    const test = await this.prisma.contentTest.findUnique({
      where: { id: testId },
    });
    if (!test) throw new NotFoundException('Test not found');
    assertScopeMatch(test, scope);

    await this.assertTestEditable(test.id, test.status);

    if (isAudio) {
      if (test.type !== ContentTestType.LISTENING) {
        throw new BadRequestException(
          'Audio uploads are only supported for listening tests',
        );
      }
    } else if (isMap) {
      if (
        test.type !== ContentTestType.LISTENING &&
        test.type !== ContentTestType.READING
      ) {
        throw new BadRequestException(
          'Map image uploads are only supported for listening and reading tests',
        );
      }
    } else if (isWritingImage) {
      if (test.type !== ContentTestType.WRITING) {
        throw new BadRequestException(
          'Task 1 image upload is only supported for writing tests',
        );
      }
    }

    if (isAudio && !AUDIO_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Invalid audio type. Use MP3, WAV, or OGG.',
      );
    }
    if ((isMap || isWritingImage) && !IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Invalid image type. Use JPEG, PNG, or WebP.',
      );
    }

    const ext = this.extensionForMime(
      file.mimetype,
      file.originalname,
      isMap || isWritingImage,
    );
    const folder = isMap ? 'maps' : isWritingImage ? 'writing' : 'listening';
    const relativePath = scope.institutionId
      ? `institutions/${scope.institutionId}/${folder}/${testId}/${key}${ext}`
      : `${folder}/${testId}/${key}${ext}`;
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
      action: auditAction,
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

  /**
   * Archived tests stay immutable. Published tests may be edited in place by
   * admins (fixes typos / content updates without forcing Retire & duplicate).
   */
  private async assertTestEditable(
    _testId: string,
    status: ContentTestStatus,
  ) {
    if (status === ContentTestStatus.ARCHIVED) {
      throw new BadRequestException('Archived tests cannot be edited.');
    }
  }

  /** Count distinct packages referencing a test via pool rows or legacy FKs. */
  private async countPackageLinks(testId: string): Promise<number> {
    const [poolRows, fkPackages] = await Promise.all([
      this.prisma.packageContentTest.findMany({
        where: { testId },
        select: { packageId: true },
      }),
      this.prisma.mockTestPackage.findMany({
        where: {
          OR: [
            { listeningTestId: testId },
            { readingTestId: testId },
            { writingTestId: testId },
            { speakingBankId: testId },
          ],
        },
        select: { id: true },
      }),
    ]);

    const packageIds = new Set<string>();
    for (const row of poolRows) packageIds.add(row.packageId);
    for (const pkg of fkPackages) packageIds.add(pkg.id);
    return packageIds.size;
  }

  private async countActivePackageLinks(testId: string): Promise<number> {
    const assignments = await findContentTestPackageAssignments(this.prisma, [
      testId,
    ]);
    return summarizeAssignmentsForTest(assignments).activePackageLinks;
  }

  private async assertValidTestCodeForScope(
    code: string,
    scope: ContentScope,
  ) {
    if (!scope.institutionId) {
      if (!isValidTestCode(code)) {
        throw new BadRequestException(
          'Test code must match format e.g. REA-MOCK-A001 (SKILL-MOCK-A###).',
        );
      }
      return;
    }
    const inst = await this.prisma.institution.findUnique({
      where: { id: scope.institutionId },
      select: { slug: true },
    });
    if (!inst) throw new NotFoundException('Institution not found');
    if (!isValidInstitutionTestCode(code, inst.slug)) {
      throw new BadRequestException(
        'Test code must match your centre prefix, e.g. CENTRE-REA-MOCK-A001.',
      );
    }
  }

  private async allocateNextTestIdentity(
    type: ContentTestType,
    scope: ContentScope = PLATFORM_CONTENT_SCOPE,
  ) {
    const tests = await this.prisma.contentTest.findMany({
      where: { type, ...scopeWhere(scope) },
      select: { code: true, title: true },
    });
    if (scope.institutionId) {
      const inst = await this.prisma.institution.findUnique({
        where: { id: scope.institutionId },
        select: { slug: true },
      });
      if (!inst) throw new NotFoundException('Institution not found');
      return nextInstitutionTestIdentity(inst.slug, type, tests);
    }
    return nextTestIdentity(type, tests);
  }
}
