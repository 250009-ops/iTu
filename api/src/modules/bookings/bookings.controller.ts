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
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

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
  @Get('availability')
  getAvailability(
    @Query('date') date: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.bookings.getAvailability(date, teacherId);
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
}
