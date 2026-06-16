import { Module } from '@nestjs/common';
import { ExamSessionsModule } from '../exam-sessions/exam-sessions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [NotificationsModule, ExamSessionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
