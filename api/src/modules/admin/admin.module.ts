import { Module, forwardRef } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ExamSessionsModule } from '../exam-sessions/exam-sessions.module';
import { GradingModule } from '../grading/grading.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResultsModule } from '../results/results.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminInstitutionsController } from './admin-institutions.controller';
import { AdminInstitutionsService } from './admin-institutions.service';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => ExamSessionsModule),
    ResultsModule,
    GradingModule,
    SettingsModule,
    BookingsModule,
  ],
  controllers: [AdminController, AdminInstitutionsController],
  providers: [AdminService, AdminInstitutionsService],
  exports: [AdminService],
})
export class AdminModule {}
