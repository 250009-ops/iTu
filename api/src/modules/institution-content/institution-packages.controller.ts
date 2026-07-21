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
import { ContentTestType, ExamType, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { InstitutionPackagesService } from './institution-packages.service';

@ApiTags('institution-packages')
@ApiBearerAuth()
@Controller('institution')
@Roles(UserRole.INSTITUTION)
export class InstitutionPackagesController {
  constructor(private packages: InstitutionPackagesService) {}

  @Get('enrollment-packages')
  listEnrollmentPackages(
    @CurrentUser() user: RequestUser,
    @Query('studentId') studentId: string,
  ) {
    return this.packages.listEnrollmentPackages(user, studentId);
  }

  @Get('packages/mine')
  listMine(@CurrentUser() user: RequestUser) {
    return this.packages.listMine(user);
  }

  @Get('packages/content-tests')
  listPublishedTests(@CurrentUser() user: RequestUser) {
    return this.packages.listPublishedTests(user);
  }

  @Get('packages/content-tests/:type')
  listPublishedTestsByType(
    @CurrentUser() user: RequestUser,
    @Param('type') type: string,
  ) {
    return this.packages.listPublishedTests(
      user,
      type.toUpperCase() as ContentTestType,
    );
  }

  @Get('packages/next-identity')
  suggestNextPackage(@CurrentUser() user: RequestUser) {
    return this.packages.suggestNextPackage(user);
  }

  @Post('packages')
  createPackage(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      title?: string;
      examType?: ExamType;
      skills?: string[];
      description?: string;
    },
  ) {
    return this.packages.createPackage(user, body);
  }

  @Patch('packages/:id')
  updatePackage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      listeningTestId?: string | null;
      readingTestId?: string | null;
      writingTestId?: string | null;
      speakingBankId?: string | null;
    },
  ) {
    return this.packages.updatePackageLinks(user, id, body);
  }

  @Post('packages/:id/activate')
  activatePackage(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.packages.activatePackage(user, id);
  }
}
