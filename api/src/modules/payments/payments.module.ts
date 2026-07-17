import { Module, forwardRef } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { CheckoutExpiryService } from './checkout-expiry.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UzumCheckoutService } from './uzum-checkout.service';

@Module({
  imports: [forwardRef(() => BookingsModule)],
  controllers: [PaymentsController],
  providers: [UzumCheckoutService, PaymentsService, CheckoutExpiryService],
  exports: [UzumCheckoutService, PaymentsService],
})
export class PaymentsModule {}
