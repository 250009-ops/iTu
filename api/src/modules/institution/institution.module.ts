import { Module, forwardRef } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ExamSessionsModule } from '../exam-sessions/exam-sessions.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { InstitutionMockSetsModule } from '../institution-mock-sets/institution-mock-sets.module';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';

@Module({
  imports: [
    BookingsModule,
    SettingsModule,
    forwardRef(() => ExamSessionsModule),
    PaymentsModule,
    NotificationsModule,
    InstitutionMockSetsModule,
  ],
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
