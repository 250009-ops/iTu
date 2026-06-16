import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  shouldSkipAuthThrottler,
  shouldSkipContactThrottler,
} from './common/throttler/throttler.utils';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ContentModule } from './modules/content/content.module';
import { ExamSessionsModule } from './modules/exam-sessions/exam-sessions.module';
import { GradingModule } from './modules/grading/grading.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ResultsModule } from './modules/results/results.module';
import { SearchModule } from './modules/search/search.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SupportModule } from './modules/support/support.module';
import { SpeakingModule } from './modules/speaking/speaking.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { MailModule } from './common/mail/mail.module';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
        limit: Number(process.env.RATE_LIMIT_MAX ?? 120),
      },
      {
        name: 'auth',
        ttl: Number(process.env.AUTH_RATE_LIMIT_TTL_MS ?? 60_000),
        limit: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 30),
        skipIf: shouldSkipAuthThrottler,
      },
      {
        name: 'contact',
        ttl: Number(process.env.CONTACT_RATE_LIMIT_TTL_MS ?? 60_000),
        limit: Number(process.env.CONTACT_RATE_LIMIT_MAX ?? 5),
        skipIf: shouldSkipContactThrottler,
      },
    ]),
    AuditModule,
    RedisModule,
    StorageModule,
    MailModule,
    PrismaModule,
    AuthModule,
    CatalogModule,
    MarketingModule,
    BookingsModule,
    StudentsModule,
    TeachersModule,
    ExamSessionsModule,
    GradingModule,
    ResultsModule,
    NotificationsModule,
    AdminModule,
    ContentModule,
    SettingsModule,
    SupportModule,
    SpeakingModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
