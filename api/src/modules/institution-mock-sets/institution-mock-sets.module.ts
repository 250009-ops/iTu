import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { InstitutionMockSetsAdminController } from './institution-mock-sets.controller';
import { InstitutionMockSetsService } from './institution-mock-sets.service';

@Module({
  imports: [AuditModule],
  controllers: [InstitutionMockSetsAdminController],
  providers: [InstitutionMockSetsService],
  exports: [InstitutionMockSetsService],
})
export class InstitutionMockSetsModule {}
