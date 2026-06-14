import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
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

  @Get(':enrollmentId')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER)
  getByEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.results.getByEnrollment(enrollmentId, user);
  }
}
