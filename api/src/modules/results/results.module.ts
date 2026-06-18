import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResultsController } from './results.controller';
import { ResultsPdfService } from './results-pdf.service';
import { ResultsReleaseService } from './results-release.service';
import { ResultsService } from './results.service';

@Module({
  imports: [StorageModule, NotificationsModule],
  controllers: [ResultsController],
  providers: [ResultsService, ResultsPdfService, ResultsReleaseService],
  exports: [ResultsPdfService, ResultsReleaseService],
})
export class ResultsModule {}
