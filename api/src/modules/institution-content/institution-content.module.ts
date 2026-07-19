import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { InstitutionMockSetsModule } from '../institution-mock-sets/institution-mock-sets.module';
import { InstitutionContentController } from './institution-content.controller';
import { InstitutionPackagesController } from './institution-packages.controller';
import { InstitutionPackagesService } from './institution-packages.service';

@Module({
  imports: [ContentModule, InstitutionMockSetsModule],
  controllers: [InstitutionContentController, InstitutionPackagesController],
  providers: [InstitutionPackagesService],
})
export class InstitutionContentModule {}
