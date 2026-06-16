import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { UpdateSpeakingStateDto } from './dto/update-speaking-state.dto';
import { SpeakingService } from './speaking.service';

@ApiTags('speaking-sessions')
@ApiBearerAuth()
@Controller()
export class SpeakingController {
  constructor(private speaking: SpeakingService) {}

  @Get('exam-sessions/:sessionCode/speaking')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  getByExamSession(
    @Param('sessionCode') sessionCode: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.speaking.getByExamSessionCode(sessionCode, user);
  }

  @Post('speaking-sessions/:id/join')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  join(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.speaking.joinSession(id, user);
  }

  @Get('speaking-sessions/:id/content')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getExaminerContent(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.speaking.getExaminerContent(id, user);
  }

  @Get('speaking-sessions/:id/state')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  getState(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.speaking.getState(id, user);
  }

  @Patch('speaking-sessions/:id/state')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateState(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSpeakingStateDto,
  ) {
    return this.speaking.updateState(id, user, dto);
  }
}
