import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PracticeCreditType, PracticeUnitType, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { PracticeAccessService } from '../practice-commerce/practice-access.service';
import { PracticeCommerceService } from '../practice-commerce/practice-commerce.service';
import { PracticePackageContentService } from '../practice-commerce/practice-package-content.service';
import { PracticeSessionsService } from '../practice-sessions/practice-sessions.service';
import {
  WritingImprovementService,
  WritingSections,
} from '../writing-practice/writing-improvement.service';
import { PracticeWalletService } from '../../common/practice/practice-wallet.service';
import { PracticeBundle } from '../../common/practice/practice.types';

@ApiTags('practice-admin')
@ApiBearerAuth()
@Controller('admin/practice')
@Roles(UserRole.ADMIN)
export class PracticeAdminCommerceController {
  constructor(
    private commerce: PracticeCommerceService,
    private content: PracticePackageContentService,
    private wallet: PracticeWalletService,
  ) {}

  @Get('packages')
  listPackages() {
    return this.commerce.listAdminPackages();
  }

  @Get('packages/content-options')
  listContentOptions(
    @Query('type') type?: string,
    @Query('taskNumber') taskNumber?: string,
    @Query('excludePackageId') excludePackageId?: string,
  ) {
    return this.content.listContentOptions({
      type: type?.trim().toUpperCase() as PracticeUnitType,
      taskNumber: taskNumber ? Number(taskNumber) : undefined,
      excludePackageId: excludePackageId?.trim(),
    });
  }

  @Get('packages/:id/content')
  getPackageContent(@Param('id') id: string) {
    return this.content.getPackageContent(id);
  }

  @Post('packages/suggest-price')
  suggestPrice(@Body() body: { bundle: PracticeBundle }) {
    return this.commerce.suggestPackagePrice(body.bundle);
  }

  @Post('packages')
  createPackage(
    @Body()
    body: {
      slug: string;
      title: string;
      description?: string;
      price: number;
      currency?: string;
      unitIds: string[];
      promptIds: string[];
      displayPrices?: Record<string, number>;
      isActive?: boolean;
      mostPopular?: boolean;
    },
  ) {
    return this.commerce.createPackage(body);
  }

  @Patch('packages/:id')
  updatePackage(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      price?: number;
      unitIds?: string[];
      promptIds?: string[];
      displayPrices?: Record<string, number>;
      isActive?: boolean;
      mostPopular?: boolean;
    },
  ) {
    return this.commerce.updatePackage(id, body);
  }

  @Post('students/:studentId/credits')
  grantCredits(
    @Param('studentId') studentId: string,
    @Body()
    body: {
      readingPassages?: number;
      readingQuestionTypes?: number;
      listeningSections?: number;
      listeningQuestionTypes?: number;
      aiWritingEssays?: number;
      note?: string;
    },
  ) {
    const { note, ...credits } = body;
    const creditMap: Partial<Record<PracticeCreditType, number>> = {};
    if (credits.readingPassages)
      creditMap[PracticeCreditType.READING_PASSAGE] = credits.readingPassages;
    if (credits.readingQuestionTypes)
      creditMap[PracticeCreditType.READING_QUESTION_TYPE] =
        credits.readingQuestionTypes;
    if (credits.listeningSections)
      creditMap[PracticeCreditType.LISTENING_SECTION] = credits.listeningSections;
    if (credits.listeningQuestionTypes)
      creditMap[PracticeCreditType.LISTENING_QUESTION_TYPE] =
        credits.listeningQuestionTypes;
    if (credits.aiWritingEssays)
      creditMap[PracticeCreditType.AI_WRITING_ESSAY] = credits.aiWritingEssays;
    return this.wallet.adminGrantCredits(studentId, creditMap, note);
  }
}

@ApiTags('practice')
@ApiBearerAuth()
@Controller('practice')
@Roles(UserRole.STUDENT)
export class PracticeStudentController {
  constructor(
    private commerce: PracticeCommerceService,
    private sessions: PracticeSessionsService,
    private writing: WritingImprovementService,
    private wallet: PracticeWalletService,
    private access: PracticeAccessService,
  ) {}

  @Get('wallet')
  getWallet(@CurrentUser() user: RequestUser) {
    return this.wallet.getWalletBalances(user.studentProfileId!);
  }

  @Get('allowance')
  getAllowance(@CurrentUser() user: RequestUser) {
    return this.access.getAllowanceSummary(user.studentProfileId!);
  }

  @Get('packages')
  listPackages() {
    return this.commerce.listPackages(true);
  }

  @Post('checkout')
  checkout(
    @Body() body: { packageId: string; portalBasePath?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.commerce.initiateCheckout(
      body.packageId,
      user,
      body.portalBasePath ?? '/student/practice',
    );
  }

  @Get('library')
  listLibrary(
    @CurrentUser() user: RequestUser,
    @Query('skill') skill?: string,
    @Query('type') type?: string,
    @Query('questionType') questionType?: string,
  ) {
    return this.sessions.listPublishedLibrary(user.studentProfileId!, {
      skill: skill?.trim().toUpperCase() as import('@prisma/client').ExamSkill,
      type: type?.trim().toUpperCase() as PracticeUnitType,
      questionType,
    });
  }

  @Get('attempts')
  listAttempts(@CurrentUser() user: RequestUser) {
    return this.sessions.listAttempts(user.studentProfileId!);
  }

  @Post('attempts')
  startAttempt(
    @Body() body: { unitId: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.sessions.startAttempt(user.studentProfileId!, body.unitId);
  }

  @Get('attempts/:id')
  getAttempt(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.sessions.getAttempt(user.studentProfileId!, id);
  }

  @Patch('attempts/:id/answers')
  saveAnswers(
    @Param('id') id: string,
    @Body() body: { answers: Record<string, unknown> },
    @CurrentUser() user: RequestUser,
  ) {
    return this.sessions.saveAnswers(
      user.studentProfileId!,
      id,
      body.answers,
    );
  }

  @Post('attempts/:id/submit')
  submitAttempt(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.sessions.submitAttempt(user.studentProfileId!, id);
  }

  @Get('writing/prompts')
  listWritingPrompts(
    @CurrentUser() user: RequestUser,
    @Query('taskNumber') taskNumber?: string,
  ) {
    const n = taskNumber ? Number(taskNumber) : undefined;
    return this.writing.listPublishedPrompts(user.studentProfileId!, n);
  }

  @Get('writing/sessions')
  listWritingSessions(@CurrentUser() user: RequestUser) {
    return this.writing.listSessions(user.studentProfileId!);
  }

  @Post('writing/sessions')
  createWritingSession(
    @Body() body: { promptId: string; sections?: Partial<WritingSections> },
    @CurrentUser() user: RequestUser,
  ) {
    return this.writing.createSession(
      user.studentProfileId!,
      body.promptId,
      body.sections,
    );
  }

  @Get('writing/sessions/:id')
  getWritingSession(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.writing.getSession(user.studentProfileId!, id);
  }

  @Patch('writing/sessions/:id')
  updateWritingSession(
    @Param('id') id: string,
    @Body() body: { sections: WritingSections },
    @CurrentUser() user: RequestUser,
  ) {
    return this.writing.updateSession(
      user.studentProfileId!,
      id,
      body.sections,
    );
  }

  @Post('writing/sessions/:id/analyze')
  analyzeWritingSession(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.writing.analyzeSession(user.studentProfileId!, id);
  }
}
