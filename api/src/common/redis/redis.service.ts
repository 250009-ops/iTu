import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.logger.warn('REDIS_URL not set — Redis features disabled');
      return;
    }

    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        enableReadyCheck: true,
      });
      this.client.on('error', (err) => {
        this.connected = false;
        this.logger.warn(`Redis error: ${err.message}`);
      });
      this.client.on('connect', () => {
        this.connected = true;
      });
      await this.client.connect();
      await this.client.ping();
      this.connected = true;
      this.logger.log('Redis connected');
    } catch (err) {
      this.connected = false;
      this.logger.warn(
        `Redis unavailable — running without cache/locks: ${err instanceof Error ? err.message : err}`,
      );
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }

  isAvailable(): boolean {
    return Boolean(this.client && this.connected);
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async setJson(key: string, value: unknown, ttlSec?: number): Promise<void> {
    if (!this.client) return;
    const payload = JSON.stringify(value);
    if (ttlSec && ttlSec > 0) {
      await this.client.set(key, payload, 'EX', ttlSec);
    } else {
      await this.client.set(key, payload);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  /**
   * Distributed lock with token-safe release.
   * Falls through to `fn()` when Redis is unavailable.
   */
  async withLock<T>(
    key: string,
    ttlSec: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!this.client) {
      return fn();
    }

    const token = randomUUID();
    const acquired = await this.client.set(key, token, 'EX', ttlSec, 'NX');
    if (acquired !== 'OK') {
      throw new Error(`Could not acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      const releaseScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      try {
        await this.client.eval(releaseScript, 1, key, token);
      } catch (err) {
        this.logger.warn(
          `Lock release failed for ${key}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
