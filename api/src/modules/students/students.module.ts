import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [NotificationsModule, CatalogModule, BookingsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
