import {
  Controller,
  Get,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { ResultsService } from './results.service';

@ApiTags('results')
@ApiBearerAuth()
@Controller('results')
export class ResultsController {
  constructor(private results: ResultsService) {}

  @Get()
  @Roles(UserRole.STUDENT)
  list(@CurrentUser() user: RequestUser) {
    return this.results.listForStudent(user);
  }

  @Get('pending')
  @Roles(UserRole.STUDENT)
  pending(@CurrentUser() user: RequestUser) {
    return this.results.getPendingForStudent(user);
  }

  @Get(':enrollmentId/pdf')
  @Roles(
    UserRole.STUDENT,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.INSTITUTION,
  )
  async downloadPdf(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.results.getPdfDownload(
      enrollmentId,
      user,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(buffer);
  }

  @Get(':enrollmentId')
  @Roles(
    UserRole.STUDENT,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.INSTITUTION,
  )
  getByEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.results.getByEnrollment(enrollmentId, user);
  }
}
