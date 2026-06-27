import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ExamSessionsModule } from '../exam-sessions/exam-sessions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    NotificationsModule,
    ExamSessionsModule,
    SettingsModule,
    BookingsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
