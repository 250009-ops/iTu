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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { ContentService } from './content.service';
import { UpdateContentTestDto } from './dto/update-content-test.dto';
import { MAX_LISTENING_AUDIO_BYTES } from './content-media.limits';

@ApiTags('content')
@ApiBearerAuth()
@Controller('admin/content')
@Roles(UserRole.ADMIN)
export class ContentController {
  constructor(private content: ContentService) {}

  @Get('tests')
  listTests(@Query('type') type?: string) {
    const testType = type
      ? (type.toUpperCase() as ContentTestType)
      : undefined;
    return this.content.listTests(testType);
  }

  @Get('tests/next-identity')
  suggestNextTestIdentity(@Query('type') type: string) {
    if (!type?.trim()) {
      throw new BadRequestException('Query parameter "type" is required');
    }
    return this.content.suggestNextTestIdentity(
      type.trim().toUpperCase() as ContentTestType,
    );
  }

  @Get('tests/:id')
  getTest(@Param('id') id: string) {
    return this.content.getTest(id);
  }

  @Post('tests')
  createTest(
    @Body()
    body: {
      code: string;
      title: string;
      type: ContentTestType;
      content: object;
      answerKey?: object;
      durationMin?: number;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.content.createTest(body, user.id);
  }

  @Post('tests/:id/publish')
  publishTest(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.content.publishTest(id, user.id);
  }

  @Post('tests/:id/submit-review')
  submitForReview(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.content.submitForReview(id, user.id);
  }

  @Post('tests/:id/revert-draft')
  revertToDraft(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.content.revertToDraft(id, user.id);
  }

  @Post('tests/import')
  importTest(
    @Body()
    body: {
      code: string;
      title: string;
      type: ContentTestType;
      content: object;
      answerKey?: object;
      durationMin?: number;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.content.importTest(body, user.id);
  }

  @Post('tests/:id/import-answer-key')
  importAnswerKey(
    @Param('id') id: string,
    @Body() body: { csv: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.content.importAnswerKeyCsv(id, body.csv, user.id);
  }

  @Post('tests/:id/clone')
  cloneTest(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.content.cloneTest(id, user.id);
  }

  @Post('tests/:id/archive')
  archiveTest(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.content.archiveTest(id, user.id);
  }

  @Post('tests/:id/retire-and-duplicate')
  retireAndDuplicate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.content.retireAndDuplicate(id, user.id);
  }

  @Patch('tests/:id')
  updateTest(
    @Param('id') id: string,
    @Body() body: UpdateContentTestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.content.updateTest(id, body, user.id);
  }

  @Delete('tests/:id')
  deleteTest(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.content.deleteTest(id, user.id);
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
    @Param('id') id: string,
    @Query('key') key: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!key?.trim()) {
      throw new BadRequestException('Query parameter "key" is required (e.g. full-audio)');
    }
    return this.content.uploadMedia(id, key.trim(), file, user.id);
  }
}
