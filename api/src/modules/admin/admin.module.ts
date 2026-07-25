import { Module, forwardRef } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ExamSessionsModule } from '../exam-sessions/exam-sessions.module';
import { GradingModule } from '../grading/grading.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResultsModule } from '../results/results.module';
import { SettingsModule } from '../settings/settings.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InstitutionMockSetsModule } from '../institution-mock-sets/institution-mock-sets.module';
import { AdminInstitutionsController } from './admin-institutions.controller';
import { AdminInstitutionsService } from './admin-institutions.service';
import { AdminAdminsController } from './admin-admins.controller';
import { AdminAdminsService } from './admin-admins.service';

@Module({
  imports: [
    NotificationsModule,
    TelegramModule,
    forwardRef(() => ExamSessionsModule),
    ResultsModule,
    GradingModule,
    SettingsModule,
    BookingsModule,
    InstitutionMockSetsModule,
  ],
  controllers: [
    AdminController,
    AdminInstitutionsController,
    AdminAdminsController,
  ],
  providers: [AdminService, AdminInstitutionsService, AdminAdminsService],
  exports: [AdminService],
})
export class AdminModule {}
