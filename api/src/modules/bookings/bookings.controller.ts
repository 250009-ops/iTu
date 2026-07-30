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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QuoteBookingDto } from './dto/quote-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { ScheduleSpeakingSlotDto } from './dto/schedule-speaking-slot.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Public()
  @Get('teachers')
  listTeachers(@Query('speciality') speciality?: 'writing' | 'speaking' | 'both') {
    return this.bookings.listTeachers(speciality);
  }

  @Public()
  @Post('quote')
  quoteBooking(@Body() dto: QuoteBookingDto) {
    return this.bookings.quoteBooking(dto);
  }

  @Public()
  @Get('availability')
  getAvailability(
    @Query('date') date: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.bookings.getAvailability(date, teacherId);
  }

  @ApiBearerAuth()
  @Get('packages/:packageId/content-availability')
  @Roles(UserRole.STUDENT)
  getContentAvailability(
    @Param('packageId') packageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.getContentAvailability(packageId, user);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(UserRole.STUDENT)
  createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.createBooking(dto, user);
  }

  @ApiBearerAuth()
  @Patch(':enrollmentId/reschedule')
  @Roles(UserRole.STUDENT)
  rescheduleBooking(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: RescheduleBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.rescheduleBooking(enrollmentId, dto, user);
  }

  @ApiBearerAuth()
  @Patch(':enrollmentId/speaking-slot')
  @Roles(UserRole.STUDENT)
  scheduleSpeakingSlot(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: ScheduleSpeakingSlotDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.scheduleSpeakingSlot(enrollmentId, dto, user);
  }
}
