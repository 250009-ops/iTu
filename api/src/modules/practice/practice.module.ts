import { Module } from '@nestjs/common';
import { PracticeWalletService } from '../../common/practice/practice-wallet.service';
import { ExamSessionsModule } from '../exam-sessions/exam-sessions.module';
import { PaymentsModule } from '../payments/payments.module';
import { PracticeContentModule } from '../practice-content/practice-content.module';
import { PracticeCommerceService } from '../practice-commerce/practice-commerce.service';
import { PracticeSessionsService } from '../practice-sessions/practice-sessions.service';
import { WritingImprovementService } from '../writing-practice/writing-improvement.service';
import {
  PracticeAdminCommerceController,
  PracticeStudentController,
} from './practice.controller';

@Module({
  imports: [PracticeContentModule, ExamSessionsModule, PaymentsModule],
  controllers: [PracticeAdminCommerceController, PracticeStudentController],
  providers: [
    PracticeCommerceService,
    PracticeSessionsService,
    WritingImprovementService,
  ],
})
export class PracticeModule {}
