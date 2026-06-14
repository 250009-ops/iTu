import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
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
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.admin.getDashboard();
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
  ) {
    return this.admin.updateTeacherStatus(id, body.status);
  }

  @Get('orders')
  getOrders() {
    return this.admin.getOrders();
  }

  @Post('orders/:id/refund')
  refundOrder(@Param('id') id: string, @Body() body: RefundOrderDto) {
    return this.admin.refundOrder(id, body);
  }

  @Get('payouts')
  getPayouts() {
    return this.admin.getPayouts();
  }

  @Patch('payouts/:id')
  updatePayout(@Param('id') id: string, @Body() body: UpdatePayoutDto) {
    return this.admin.updatePayout(id, body);
  }

  @Get('band-table')
  getBandTable() {
    return this.admin.getBandTable();
  }

  @Put('band-table')
  updateBandTable(@Body() body: UpdateBandTableDto) {
    return this.admin.updateBandTable(body);
  }

  @Get('disputes')
  getDisputes() {
    return this.admin.getDisputes();
  }

  @Patch('disputes/:id')
  updateTicket(@Param('id') id: string, @Body() body: UpdateTicketDto) {
    return this.admin.updateTicket(id, body);
  }

  @Get('packages')
  getPackages() {
    return this.admin.getPackages();
  }

  @Post('packages')
  createPackage(@Body() body: CreatePackageDto) {
    return this.admin.createPackage(body);
  }

  @Patch('packages/:id')
  updatePackage(@Param('id') id: string, @Body() body: UpdatePackageDto) {
    return this.admin.updatePackage(id, body);
  }

  @Delete('packages/:id')
  deletePackage(@Param('id') id: string) {
    return this.admin.deletePackage(id);
  }

  @Get('reports/summary')
  getReports() {
    return this.admin.getReports();
  }

  @Get('sessions/live')
  getLiveSessions() {
    return this.admin.getDashboard().then((d) => d.liveSessions);
  }
}
