import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';

@Module({
  imports: [BookingsModule, PaymentsModule, NotificationsModule],
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
