import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentsModule } from '../payments/payments.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { EnrollmentLifecycleService } from './enrollment-lifecycle.service';

@Module({
  imports: [
    NotificationsModule,
    SettingsModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, EnrollmentLifecycleService],
  exports: [BookingsService, EnrollmentLifecycleService],
})
export class BookingsModule {}
