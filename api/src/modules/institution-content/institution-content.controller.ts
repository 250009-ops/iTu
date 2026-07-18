import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ContentTestType, UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuditAction } from '../../common/audit/audit.actions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { requireInstitutionId } from '../../common/institution/institution-scope';
import { RequestUser } from '../../common/types/request-user';
import { ContentScope } from '../content/content-scope';
import { ContentService } from '../content/content.service';
import { UpdateContentTestDto } from '../content/dto/update-content-test.dto';
import { MAX_LISTENING_AUDIO_BYTES } from '../content/content-media.limits';

function institutionScope(user: RequestUser): ContentScope {
  return { institutionId: requireInstitutionId(user) };
}

@ApiTags('institution-content')
@ApiBearerAuth()
@Controller('institution/content')
@Roles(UserRole.INSTITUTION)
export class InstitutionContentController {
  constructor(private content: ContentService) {}

  @Get('tests')
  listTests(@CurrentUser() user: RequestUser, @Query('type') type?: string) {
    const testType = type
      ? (type.toUpperCase() as ContentTestType)
      : undefined;
    return this.content.listTests(testType, institutionScope(user));
  }

  @Get('tests/next-identity')
  suggestNextTestIdentity(
    @CurrentUser() user: RequestUser,
    @Query('type') type: string,
  ) {
    if (!type?.trim()) {
      throw new BadRequestException('Query parameter "type" is required');
    }
    return this.content.suggestNextTestIdentity(
      type.trim().toUpperCase() as ContentTestType,
      institutionScope(user),
    );
  }

  @Get('tests/:id')
  getTest(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.content.getTest(id, institutionScope(user));
  }

  @Post('tests')
  createTest(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      code: string;
      title: string;
      type: ContentTestType;
      content: object;
      answerKey?: object;
      durationMin?: number;
    },
  ) {
    return this.content.createTest(
      body,
      user.id,
      institutionScope(user),
      AuditAction.INSTITUTION_CONTENT_TEST_CREATE,
    );
  }

  @Patch('tests/:id')
  updateTest(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateContentTestDto,
  ) {
    return this.content.updateTest(
      id,
      body,
      user.id,
      institutionScope(user),
      AuditAction.INSTITUTION_CONTENT_TEST_UPDATE,
    );
  }

  @Post('tests/:id/publish')
  publishTest(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.content.publishTest(
      id,
      user.id,
      institutionScope(user),
      AuditAction.INSTITUTION_CONTENT_TEST_PUBLISH,
    );
  }

  @Post('tests/:id/clone')
  cloneTest(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.content.cloneTest(
      id,
      user.id,
      institutionScope(user),
      AuditAction.INSTITUTION_CONTENT_TEST_CREATE,
    );
  }

  @Delete('tests/:id')
  deleteTest(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.content.deleteTest(
      id,
      user.id,
      institutionScope(user),
      AuditAction.INSTITUTION_CONTENT_TEST_DELETE,
    );
  }

  @Post('tests/:id/media')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LISTENING_AUDIO_BYTES },
    }),
  )
  uploadMedia(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('key') key: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!key?.trim()) {
      throw new BadRequestException(
        'Query parameter "key" is required (e.g. full-audio)',
      );
    }
    return this.content.uploadMedia(
      id,
      key.trim(),
      file,
      user.id,
      institutionScope(user),
      AuditAction.INSTITUTION_CONTENT_MEDIA_UPLOAD,
    );
  }
}
