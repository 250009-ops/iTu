import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get('examiner-rate-tiers')
  getExaminerRateTiers() {
    return this.settings.getExaminerRateTiersPublic();
  }
}
