import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { AdminInstitutionsService } from './admin-institutions.service';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { PatchInstitutionDto } from './dto/patch-institution.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/institutions')
@Roles(UserRole.ADMIN)
export class AdminInstitutionsController {
  constructor(private readonly service: AdminInstitutionsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.service.list(status);
  }

  @Get('applications')
  applications() {
    return this.service.applications();
  }

  @Get(':id/mock-set-grants/available')
  listGrantableMockSets(@Param('id') id: string) {
    return this.service.listGrantableMockSets(id);
  }

  @Get(':id/mock-set-grants')
  listMockSetGrants(@Param('id') id: string) {
    return this.service.listMockSetGrants(id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.reject(id, user.id);
  }

  @Patch(':id')
  patch(
    @Param('id') id: string,
    @Body() dto: PatchInstitutionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.patch(id, dto, user.id);
  }

  @Post(':id/credits/adjust')
  adjustCredits(
    @Param('id') id: string,
    @Body() dto: AdjustCreditsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.adjustCredits(id, dto, user.id);
  }

  @Post(':id/mock-set-grants')
  grantMockSet(
    @Param('id') id: string,
    @Body() body: { setId: string; note?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.grantMockSet(id, body.setId, user.id, body.note);
  }

  @Delete(':id/mock-set-grants/:setId')
  revokeMockSetGrant(
    @Param('id') id: string,
    @Param('setId') setId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.revokeMockSetGrant(id, setId, user.id);
  }
}
