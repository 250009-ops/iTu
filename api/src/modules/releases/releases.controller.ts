import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ReleasesService } from './releases.service';

@ApiTags('releases')
@Controller('releases')
export class ReleasesController {
  constructor(private releases: ReleasesService) {}

  @Public()
  @Get('desktop/latest')
  getLatestDesktop(
    @Query('platform') platform?: 'windows' | 'macos' | 'linux',
  ) {
    const resolved = platform ?? 'windows';
    if (!['windows', 'macos', 'linux'].includes(resolved)) {
      return this.releases.getLatestDesktop('windows');
    }
    return this.releases.getLatestDesktop(resolved);
  }

  @Public()
  @Get('desktop')
  getAllDesktop() {
    return this.releases.getAllDesktop();
  }
}
