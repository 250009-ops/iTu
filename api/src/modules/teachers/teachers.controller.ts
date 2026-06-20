import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { TeachersService } from './teachers.service';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';

@ApiTags('teachers')
@ApiBearerAuth()
@Controller('teachers')
@Roles(UserRole.TEACHER)
export class TeachersController {
  constructor(private teachers: TeachersService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.teachers.getDashboard(user);
  }

  @Get('speaking-sessions')
  getSpeakingSessions(@CurrentUser() user: RequestUser) {
    return this.teachers.getSpeakingSessions(user);
  }

  @Get('availability')
  getAvailability(
    @CurrentUser() user: RequestUser,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.teachers.getAvailability(user, weekStart);
  }

  @Put('availability')
  updateAvailability(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      slots: { dayOfWeek: number; startTime: string; endTime: string }[];
      slotDuration?: number;
    },
  ) {
    return this.teachers.updateAvailability(
      user,
      body.slots,
      body.slotDuration,
    );
  }

  @Patch('slots/:slotId/block')
  blockSlot(
    @CurrentUser() user: RequestUser,
    @Param('slotId') slotId: string,
  ) {
    return this.teachers.blockSlot(user, slotId);
  }

  @Patch('slots/:slotId/unblock')
  unblockSlot(
    @CurrentUser() user: RequestUser,
    @Param('slotId') slotId: string,
  ) {
    return this.teachers.unblockSlot(user, slotId);
  }

  @Get('earnings')
  getEarnings(@CurrentUser() user: RequestUser) {
    return this.teachers.getEarnings(user);
  }

  @Post('payouts/request')
  requestPayout(@CurrentUser() user: RequestUser) {
    return this.teachers.requestPayout(user);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.teachers.getProfile(user);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateTeacherProfileDto,
  ) {
    return this.teachers.updateProfile(user, body);
  }
}
