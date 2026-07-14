import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { InstExaminerService } from './inst-examiner.service';

@ApiTags('inst-examiner')
@ApiBearerAuth()
@Controller('inst-examiner')
@Roles(UserRole.TEACHER)
export class InstExaminerController {
  constructor(private readonly instExaminer: InstExaminerService) {}

  @Get('overview')
  getOverview(@CurrentUser() user: RequestUser) {
    return this.instExaminer.overview(user);
  }
}
