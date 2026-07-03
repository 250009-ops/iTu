import { Module } from '@nestjs/common';
import { GradingModule } from '../grading/grading.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';

@Module({
  imports: [NotificationsModule, SettingsModule, GradingModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
