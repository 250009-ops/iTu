import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { LeaderboardConsentDto } from './dto/leaderboard-consent.dto';
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

  @Patch('leaderboard-consent')
  setLeaderboardConsent(
    @CurrentUser() user: RequestUser,
    @Body() dto: LeaderboardConsentDto,
  ) {
    return this.students.setLeaderboardConsent(user, dto.publish);
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
