import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { InstitutionModule } from '../institution/institution.module';
import { TeachersModule } from '../teachers/teachers.module';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [
    forwardRef(() => AdminModule),
    forwardRef(() => InstitutionModule),
    TeachersModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
