import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [NotificationsModule, CatalogModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
