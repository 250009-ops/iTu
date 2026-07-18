import { Module } from '@nestjs/common';
import { PracticeContentController } from './practice-content.controller';
import { PracticeContentService } from './practice-content.service';

@Module({
  controllers: [PracticeContentController],
  providers: [PracticeContentService],
  exports: [PracticeContentService],
})
export class PracticeContentModule {}
