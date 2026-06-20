import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { GradingService } from './grading.service';
import type { WritingCriteriaScoresPayload } from './writing-band-validation';

@ApiTags('grading')
@ApiBearerAuth()
@Controller('grading')
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class GradingController {
  constructor(private grading: GradingService) {}

  @Get('writing-queue')
  getWritingQueue(@CurrentUser() user: RequestUser) {
    return this.grading.getWritingQueue(user);
  }

  @Get('writing-hub')
  getWritingGradingHub(@CurrentUser() user: RequestUser) {
    return this.grading.getWritingGradingHub(user);
  }

  @Get('speaking-queue')
  getSpeakingQueue(@CurrentUser() user: RequestUser) {
    return this.grading.getSpeakingQueue(user);
  }

  @Get('writing/:id')
  getWritingSubmission(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.grading.getWritingSubmission(id, user);
  }

  @Post('writing/:id/ai-evaluate')
  triggerWritingAiEvaluation(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.grading.triggerWritingAiEvaluation(id, user);
  }

  @Post('writing/:id/score')
  scoreWriting(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      criteriaScores: WritingCriteriaScoresPayload;
      overallBand: number;
      feedback?: string;
    },
  ) {
    return this.grading.scoreWriting(id, user, body);
  }

  @Get('speaking/:id')
  getSpeakingSession(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.grading.getSpeakingSession(id, user);
  }

  @Post('speaking/:id/score')
  scoreSpeaking(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      criteriaScores: Record<string, number>;
      overallBand: number;
      feedback?: string;
      teacherNotes?: string;
    },
  ) {
    return this.grading.scoreSpeaking(id, user, body);
  }
}
