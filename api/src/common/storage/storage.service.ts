import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

const ALLOWED_PREFIXES = ['listening/', 'recordings/', 'results/'];

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private mediaRoot = '';
  private publicBaseUrl = '';

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const driver = this.config.get<string>('STORAGE_DRIVER', 'local');
    if (driver !== 'local') {
      this.logger.warn(`STORAGE_DRIVER=${driver} is not supported; using local`);
    }

    this.mediaRoot = path.resolve(
      this.config.get<string>('MEDIA_ROOT', './storage/media'),
    );
    this.publicBaseUrl = (
      this.config.get<string>('MEDIA_PUBLIC_URL') ?? ''
    ).replace(/\/$/, '');

    if (this.isConfigured()) {
      await fs.mkdir(this.mediaRoot, { recursive: true });
      this.logger.log(`Local media storage ready at ${this.mediaRoot}`);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.mediaRoot && this.publicBaseUrl);
  }

  getMediaRoot(): string {
    return this.mediaRoot;
  }

  getPublicUrl(relativePath: string): string {
    const safe = this.assertSafeRelativePath(relativePath);
    return `${this.publicBaseUrl}/${safe.replace(/\\/g, '/')}`;
  }

  async saveBuffer(relativePath: string, data: Buffer): Promise<string> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Media storage is not configured. Set MEDIA_ROOT and MEDIA_PUBLIC_URL in api/.env',
      );
    }

    const safe = this.assertSafeRelativePath(relativePath);
    const absolute = path.join(this.mediaRoot, safe);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, data);
    return this.getPublicUrl(safe);
  }

  async mirrorRemoteFile(
    remoteUrl: string,
    relativePath: string,
  ): Promise<string> {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Failed to download ${remoteUrl}: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return this.saveBuffer(relativePath, buffer);
  }

  async deleteFile(relativePath: string): Promise<void> {
    if (!this.isConfigured()) return;
    const safe = this.assertSafeRelativePath(relativePath);
    const absolute = path.join(this.mediaRoot, safe);
    await fs.unlink(absolute).catch(() => undefined);
  }

  async readBuffer(relativePath: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Media storage is not configured');
    }
    const safe = this.assertSafeRelativePath(relativePath);
    const absolute = path.join(this.mediaRoot, safe);
    return fs.readFile(absolute);
  }

  private assertSafeRelativePath(relativePath: string): string {
    const normalized = path
      .normalize(relativePath)
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/^[/\\]+/, '');

    if (!normalized || normalized.includes('..')) {
      throw new BadRequestException('Invalid media path');
    }

    const allowed = ALLOWED_PREFIXES.some((prefix) =>
      normalized.startsWith(prefix),
    );
    if (!allowed) {
      throw new BadRequestException(
        `Media path must start with one of: ${ALLOWED_PREFIXES.join(', ')}`,
      );
    }

    return normalized;
  }
}
