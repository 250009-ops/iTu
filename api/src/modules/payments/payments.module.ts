import { Module, forwardRef } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { CheckoutExpiryService } from './checkout-expiry.service';
import { LemonSqueezyService } from './lemon-squeezy.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [forwardRef(() => BookingsModule)],
  controllers: [PaymentsController],
  providers: [
    LemonSqueezyService,
    PaymentsService,
    CheckoutExpiryService,
  ],
  exports: [LemonSqueezyService, PaymentsService],
})
export class PaymentsModule {}
