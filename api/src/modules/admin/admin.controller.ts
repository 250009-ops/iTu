import {
  Body,
  Controller,
  Delete,
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
import { ExamSessionsService } from '../exam-sessions/exam-sessions.service';
import { AdminService } from './admin.service';
import { ReviewIntegrityDto } from './dto/review-integrity.dto';
import { UpdateBandTableDto } from './dto/band-table.dto';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private admin: AdminService,
    private examSessions: ExamSessionsService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.admin.getDashboard();
  }

  @Get('nav-badges')
  getNavBadges() {
    return this.admin.getNavBadges();
  }

  @Get('enrollments')
  getEnrollments() {
    return this.admin.getEnrollments();
  }

  @Get('teachers')
  getTeachers() {
    return this.admin.getTeachers();
  }

  @Patch('teachers/:id/status')
  updateTeacherStatus(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'pending' | 'suspended' },
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateTeacherStatus(id, body.status, user.id);
  }

  @Get('orders')
  getOrders() {
    return this.admin.getOrders();
  }

  @Post('orders/:id/refund')
  refundOrder(
    @Param('id') id: string,
    @Body() body: RefundOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.refundOrder(id, body, user.id);
  }

  @Get('payouts')
  getPayouts() {
    return this.admin.getPayouts();
  }

  @Patch('payouts/:id')
  updatePayout(
    @Param('id') id: string,
    @Body() body: UpdatePayoutDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updatePayout(id, body, user.id);
  }

  @Get('band-table')
  getBandTable() {
    return this.admin.getBandTable();
  }

  @Put('band-table')
  updateBandTable(
    @Body() body: UpdateBandTableDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateBandTable(body, user.id);
  }

  @Get('disputes')
  getDisputes() {
    return this.admin.getDisputes();
  }

  @Patch('disputes/:id')
  updateTicket(
    @Param('id') id: string,
    @Body() body: UpdateTicketDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateTicket(id, body, user.id);
  }

  @Post('enrollments/:id/reassign-writing-teacher')
  reassignWritingTeacher(
    @Param('id') id: string,
    @Body() body: { teacherId: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.reassignWritingTeacher(id, body.teacherId, user.id);
  }

  @Post('enrollments/:id/regrade')
  reopenForRegrade(
    @Param('id') id: string,
    @Body() body: { skill: 'writing' | 'speaking'; reason?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.reopenForRegrade(id, body.skill, user.id, body.reason);
  }

  @Get('packages')
  getPackages() {
    return this.admin.getPackages();
  }

  @Post('packages')
  createPackage(
    @Body() body: CreatePackageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.createPackage(body, user.id);
  }

  @Patch('packages/:id')
  updatePackage(
    @Param('id') id: string,
    @Body() body: UpdatePackageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updatePackage(id, body, user.id);
  }

  @Delete('packages/:id')
  deletePackage(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.admin.deletePackage(id, user.id);
  }

  @Post('packages/:id/clone')
  clonePackage(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.admin.clonePackage(id, user.id);
  }

  @Get('reports/summary')
  getReports() {
    return this.admin.getReports();
  }

  @Get('sessions/live')
  getLiveSessions() {
    return this.admin.getLiveSessions();
  }

  @Get('sessions/:sessionCode')
  getSessionDetail(@Param('sessionCode') sessionCode: string) {
    return this.examSessions.getAdminSessionDetail(sessionCode);
  }

  @Post('sessions/:sessionCode/force-submit')
  forceSubmit(
    @Param('sessionCode') sessionCode: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.adminForceSubmit(sessionCode, user);
  }

  @Post('sessions/:sessionCode/integrity/review')
  reviewIntegrity(
    @Param('sessionCode') sessionCode: string,
    @Body() dto: ReviewIntegrityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examSessions.adminReviewIntegrity(
      sessionCode,
      dto.decision,
      dto.note,
      user,
    );
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('entity') entity?: string,
  ) {
    return this.admin.getAuditLogs({
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      entity,
    });
  }
}
