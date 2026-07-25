import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { LeaderboardConsentDto } from './dto/leaderboard-consent.dto';
import { ClaimReferralRewardDto } from './dto/claim-referral-reward.dto';
import { ClaimWelcomePromoDto } from './dto/claim-welcome-promo.dto';
import { SendReferralInviteDto } from './dto/send-referral-invite.dto';
import { SkipMockFeedbackDto } from './dto/skip-mock-feedback.dto';
import { SubmitMockFeedbackDto } from './dto/submit-mock-feedback.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
@Roles(UserRole.STUDENT)
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.students.getDashboard(user);
  }

  @Post('welcome-promo/claim')
  claimWelcomePromo(
    @CurrentUser() user: RequestUser,
    @Body() dto: ClaimWelcomePromoDto,
  ) {
    return this.students.claimWelcomePromo(user, dto);
  }

  @Get('referral')
  getReferralStatus(@CurrentUser() user: RequestUser) {
    return this.students.getReferralStatus(user);
  }

  @Post('referral/invite')
  sendReferralInvite(
    @CurrentUser() user: RequestUser,
    @Body() dto: SendReferralInviteDto,
  ) {
    return this.students.sendReferralInvite(user, dto);
  }

  @Post('referral/claim')
  claimReferralReward(
    @CurrentUser() user: RequestUser,
    @Body() dto: ClaimReferralRewardDto,
  ) {
    return this.students.claimReferralReward(user, dto);
  }

  @Get('catalog/packages')
  listCatalogPackages(@CurrentUser() user: RequestUser) {
    return this.students.listCatalogPackages(user);
  }

  @Get('catalog/offers')
  listCatalogOffers(@CurrentUser() user: RequestUser) {
    return this.students.listCatalogOffers(user);
  }

  @Get('mock-day')
  getMockDay(@CurrentUser() user: RequestUser) {
    return this.students.getMockDayHub(user);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.students.getProfile(user);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.students.updateProfile(user, dto);
  }

  @Get('reviewables')
  getReviewables(@CurrentUser() user: RequestUser) {
    return this.students.getReviewables(user);
  }

  @Post('reviews')
  submitReview(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.students.submitReview(user, dto);
  }

  /** Marketplace-only: pending post-mock feedback prompt (null when none). */
  @Get('mock-feedback/pending')
  getPendingMockFeedback(@CurrentUser() user: RequestUser) {
    return this.students.getPendingMockFeedback(user);
  }

  @Post('mock-feedback')
  submitMockFeedback(
    @CurrentUser() user: RequestUser,
    @Body() dto: SubmitMockFeedbackDto,
  ) {
    return this.students.submitMockFeedback(user, dto);
  }

  @Post('mock-feedback/skip')
  skipMockFeedback(
    @CurrentUser() user: RequestUser,
    @Body() dto: SkipMockFeedbackDto,
  ) {
    return this.students.skipMockFeedback(user, dto);
  }

  @Patch('leaderboard-consent')
  setLeaderboardConsent(
    @CurrentUser() user: RequestUser,
    @Body() dto: LeaderboardConsentDto,
  ) {
    return this.students.setLeaderboardConsent(user, dto.publish);
  }

  @Get('leaderboard')
  getLeaderboard(@CurrentUser() user: RequestUser) {
    return this.students.getLeaderboard(user);
  }

  @Get('teachers')
  listTeachers(
    @CurrentUser() user: RequestUser,
    @Query('limit') limit?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('speciality') speciality?: 'writing' | 'speaking' | 'both',
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.students.listTeachers(user, {
      limit: parsedLimit && parsedLimit > 0 ? parsedLimit : undefined,
      activeOnly: activeOnly === 'true' || activeOnly === '1',
      speciality,
    });
  }

  @Get('teachers/:slug')
  getTeacher(
    @CurrentUser() user: RequestUser,
    @Param('slug') slug: string,
  ) {
    return this.students.getTeacher(user, slug);
  }

  @Post('support-tickets')
  createSupportTicket(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.students.createSupportTicket(user, dto);
  }

  @Get('me/data-export')
  exportPersonalData(@CurrentUser() user: RequestUser) {
    return this.students.exportPersonalData(user);
  }
}
