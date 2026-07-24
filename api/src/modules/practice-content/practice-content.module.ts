import { Module } from '@nestjs/common';
import { PracticeAiModule } from '../practice-ai/practice-ai.module';
import { PracticeContentController } from './practice-content.controller';
import { PracticeContentService } from './practice-content.service';

@Module({
  imports: [PracticeAiModule],
  controllers: [PracticeContentController],
  providers: [PracticeContentService],
  exports: [PracticeContentService],
})
export class PracticeContentModule {}
