import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { ResultsController } from './results.controller';
import { ResultsPdfService } from './results-pdf.service';
import { ResultsService } from './results.service';

@Module({
  imports: [StorageModule],
  controllers: [ResultsController],
  providers: [ResultsService, ResultsPdfService],
  exports: [ResultsPdfService],
})
export class ResultsModule {}
