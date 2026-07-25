import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RequireAdminPermission } from '../../common/decorators/admin-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { AdminAdminsService } from './admin-admins.service';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/admins')
@Roles(UserRole.ADMIN)
@RequireAdminPermission('main-admin')
export class AdminAdminsController {
  constructor(private readonly service: AdminAdminsService) {}

  @Get('catalog')
  catalog() {
    return this.service.catalog();
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user);
  }

  @Post('invite')
  invite(@CurrentUser() user: RequestUser, @Body() dto: InviteAdminDto) {
    return this.service.invite(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/resend-invite')
  resendInvite(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.resendInvite(user, id);
  }
}
