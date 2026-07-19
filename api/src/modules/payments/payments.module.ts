import { Module, forwardRef } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { InstitutionMockSetsModule } from '../institution-mock-sets/institution-mock-sets.module';
import { CheckoutExpiryService } from './checkout-expiry.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UzumCheckoutService } from './uzum-checkout.service';

@Module({
  imports: [forwardRef(() => BookingsModule), InstitutionMockSetsModule],
  controllers: [PaymentsController],
  providers: [UzumCheckoutService, PaymentsService, CheckoutExpiryService],
  exports: [UzumCheckoutService, PaymentsService],
})
export class PaymentsModule {}
