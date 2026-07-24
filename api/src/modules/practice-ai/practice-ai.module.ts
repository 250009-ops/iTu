import { Module } from '@nestjs/common';
import { PracticeAiPackService } from './practice-ai-pack.service';
import { PracticeReviewService } from './practice-review.service';
import { PracticeTutorService } from './practice-tutor.service';

@Module({
  providers: [
    PracticeAiPackService,
    PracticeReviewService,
    PracticeTutorService,
  ],
  exports: [
    PracticeAiPackService,
    PracticeReviewService,
    PracticeTutorService,
  ],
})
export class PracticeAiModule {}
