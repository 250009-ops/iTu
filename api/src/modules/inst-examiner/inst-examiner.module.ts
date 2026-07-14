import { Module } from '@nestjs/common';
import { InstExaminerController } from './inst-examiner.controller';
import { InstExaminerService } from './inst-examiner.service';

@Module({
  controllers: [InstExaminerController],
  providers: [InstExaminerService],
})
export class InstExaminerModule {}
