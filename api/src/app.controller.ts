import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/decorators/public.decorator';
import { RedisService } from './common/redis/redis.service';
import { StorageService } from './common/storage/storage.service';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private storage: StorageService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get('health')
  async health() {
    const [dbOk, redisOk] = await Promise.all([
      this.prisma
        .$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false),
      this.redis.ping(),
    ]);

    const status = dbOk ? 'ok' : 'degraded';

    return {
      status,
      service: 'ielts-mock-erp-api',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : this.redis.isAvailable() ? 'down' : 'disabled',
        media: this.storage.isConfigured() ? 'configured' : 'not_configured',
      },
    };
  }
}
