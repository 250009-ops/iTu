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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { CreateCreditCheckoutDto } from './dto/create-credit-checkout.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { InviteExaminerDto } from './dto/invite-examiner.dto';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';
import { InstitutionService } from './institution.service';

@ApiTags('institution')
@ApiBearerAuth()
@Controller('institution')
@Roles(UserRole.INSTITUTION)
export class InstitutionController {
  constructor(private readonly institution: InstitutionService) {}

  @Get('overview')
  getOverview(@CurrentUser() user: RequestUser) {
    return this.institution.getOverview(user);
  }

  @Get('credits')
  getCredits(@CurrentUser() user: RequestUser) {
    return this.institution.getCredits(user);
  }

  @Post('credits/checkout')
  createCreditCheckout(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCreditCheckoutDto,
  ) {
    return this.institution.createCreditCheckout(user, dto);
  }

  @Get('credits/orders/:orderCode/status')
  getCreditOrderStatus(
    @CurrentUser() user: RequestUser,
    @Param('orderCode') orderCode: string,
  ) {
    return this.institution.getCreditOrderStatus(user, orderCode);
  }

  @Get('students')
  listStudents(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
  ) {
    return this.institution.listStudents(user, status);
  }

  @Post('students/:id/approve')
  approveStudent(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.institution.approveStudent(user, id);
  }

  @Post('students/:id/reject')
  rejectStudent(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.institution.rejectStudent(user, id);
  }

  @Post('enroll')
  enrollStudents(
    @CurrentUser() user: RequestUser,
    @Body() dto: EnrollStudentsDto,
  ) {
    return this.institution.enrollStudents(user, dto);
  }

  @Get('examiners')
  listExaminers(@CurrentUser() user: RequestUser) {
    return this.institution.listExaminers(user);
  }

  @Post('examiners/invite')
  inviteExaminer(
    @CurrentUser() user: RequestUser,
    @Body() dto: InviteExaminerDto,
  ) {
    return this.institution.inviteExaminer(user, dto);
  }

  @Get('enrollments')
  listEnrollments(@CurrentUser() user: RequestUser) {
    return this.institution.listEnrollments(user);
  }

  @Get('reports/cohort')
  getCohortReport(
    @CurrentUser() user: RequestUser,
    @Query('range') range?: string,
  ) {
    return this.institution.getCohortReport(user, range);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.institution.getProfile(user);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateInstitutionProfileDto,
  ) {
    return this.institution.updateProfile(user, dto);
  }
}
