import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { InstitutionContentController } from './institution-content.controller';
import { InstitutionPackagesController } from './institution-packages.controller';
import { InstitutionPackagesService } from './institution-packages.service';

@Module({
  imports: [ContentModule],
  controllers: [InstitutionContentController, InstitutionPackagesController],
  providers: [InstitutionPackagesService],
})
export class InstitutionContentModule {}
