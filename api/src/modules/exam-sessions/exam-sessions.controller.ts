import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExamSkill, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import {
  CheckInDto,
  LogIntegrityDto,
  SaveAnswersDto,
  StartSectionDto,
  SubmitSectionDto,
  SubmitWritingDto,
} from './dto/exam-session.dto';
import { ExamSessionsService } from './exam-sessions.service';

@ApiTags('exam-sessions')
@ApiBearerAuth()
@Controller('exam-sessions')
export class ExamSessionsController {
  constructor(private examSessions: ExamSessionsService) {}

  @Get(':sessionCode')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  getSession(
    @Param('sessionCode') sessionCode: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.getByCode(sessionCode, user);
  }

  @Post(':sessionCode/check-in')
  @Roles(UserRole.STUDENT)
  checkIn(
    @Param('sessionCode') sessionCode: string,
    @Body() _dto: CheckInDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.checkIn(sessionCode, user);
  }

  @Post(':sessionCode/start-section')
  @Roles(UserRole.STUDENT)
  startSection(
    @Param('sessionCode') sessionCode: string,
    @Body() dto: StartSectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.startSection(sessionCode, dto.skill, user);
  }

  @Post(':sessionCode/answers')
  @Roles(UserRole.STUDENT)
  saveAnswers(
    @Param('sessionCode') sessionCode: string,
    @Body() dto: SaveAnswersDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.saveAnswers(sessionCode, dto, user);
  }

  @Post(':sessionCode/submit-section')
  @Roles(UserRole.STUDENT)
  submitSection(
    @Param('sessionCode') sessionCode: string,
    @Body() dto: SubmitSectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.submitSection(sessionCode, dto, user);
  }

  @Post(':sessionCode/submit-writing')
  @Roles(UserRole.STUDENT)
  submitWriting(
    @Param('sessionCode') sessionCode: string,
    @Body() dto: SubmitWritingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.submitWriting(
      sessionCode,
      dto.task1Text,
      dto.task2Text,
      user,
    );
  }

  @Get(':sessionCode/timer')
  @Roles(UserRole.STUDENT)
  getTimer(
    @Param('sessionCode') sessionCode: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.getTimer(sessionCode, user);
  }

  @Post(':sessionCode/integrity')
  @Roles(UserRole.STUDENT)
  logIntegrity(
    @Param('sessionCode') sessionCode: string,
    @Body() dto: LogIntegrityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.logIntegrity(
      sessionCode,
      dto.event,
      dto.metadata,
      user,
    );
  }

  @Get(':sessionCode/content/:skill')
  @Roles(UserRole.STUDENT)
  getContent(
    @Param('sessionCode') sessionCode: string,
    @Param('skill') skill: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.getExamContent(
      sessionCode,
      skill.toUpperCase() as ExamSkill,
      user,
    );
  }
}
