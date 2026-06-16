import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('admin/settings')
@Roles(UserRole.ADMIN)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  getAll() {
    return this.settings.getAll();
  }

  @Get(':section')
  getSection(@Param('section') section: string) {
    return this.settings.getSection(section);
  }

  @Patch(':section')
  updateSection(
    @Param('section') section: string,
    @Body() body: object,
    @CurrentUser() user: RequestUser,
  ) {
    return this.settings.updateSection(section, body, user.id);
  }
}
