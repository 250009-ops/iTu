import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Public()
  @Get('packages')
  listPackages() {
    return this.catalog.listPackages();
  }

  @Public()
  @Get('packages/:slug')
  getPackage(@Param('slug') slug: string) {
    return this.catalog.getPackage(slug);
  }
}
