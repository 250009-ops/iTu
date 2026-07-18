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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ContentTestStatus,
  ExamSkill,
  PracticeUnitType,
  UserRole,
} from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { PracticeContentService } from './practice-content.service';

@ApiTags('practice-content')
@ApiBearerAuth()
@Controller('admin/practice')
@Roles(UserRole.ADMIN)
export class PracticeContentController {
  constructor(private practiceContent: PracticeContentService) {}

  @Get('units')
  listUnits(
    @Query('type') type?: string,
    @Query('skill') skill?: string,
    @Query('status') status?: string,
  ) {
    return this.practiceContent.listUnits({
      type: type?.trim().toUpperCase() as PracticeUnitType | undefined,
      skill: skill?.trim().toUpperCase() as ExamSkill | undefined,
      status: status?.trim().toUpperCase() as ContentTestStatus | undefined,
    });
  }

  @Get('units/next-identity')
  suggestNextIdentity(@Query('type') type: string) {
    if (!type?.trim()) {
      throw new BadRequestException('Query parameter "type" is required');
    }
    return this.practiceContent.suggestNextUnitIdentity(
      type.trim().toUpperCase() as PracticeUnitType,
    );
  }

  @Get('units/:id')
  getUnit(@Param('id') id: string) {
    return this.practiceContent.getUnit(id);
  }

  @Post('units')
  createUnit(
    @Body()
    body: {
      code: string;
      title: string;
      type: PracticeUnitType;
      questionType?: string;
      content: object;
      answerKey?: object;
      durationMin?: number;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.practiceContent.createUnit(body, user.id);
  }

  @Patch('units/:id')
  updateUnit(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      questionType?: string;
      content?: object;
      answerKey?: object;
      durationMin?: number;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.practiceContent.updateUnit(id, body, user.id);
  }

  @Post('units/:id/publish')
  publishUnit(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.practiceContent.publishUnit(id, user.id);
  }

  @Post('units/:id/archive')
  archiveUnit(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.practiceContent.archiveUnit(id, user.id);
  }

  @Delete('units/:id')
  deleteUnit(@Param('id') id: string) {
    return this.practiceContent.deleteUnit(id);
  }

  @Post('units/:id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @Param('id') id: string,
    @Query('key') key: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!key?.trim()) {
      throw new BadRequestException('Query parameter "key" is required');
    }
    if (!file) throw new BadRequestException('File is required');
    return this.practiceContent.uploadUnitMedia(id, key.trim(), file);
  }

  @Get('writing-prompts')
  listWritingPrompts(@Query('status') status?: string) {
    return this.practiceContent.listWritingPrompts(
      status?.trim().toUpperCase() as ContentTestStatus | undefined,
    );
  }

  @Get('writing-prompts/next-identity')
  suggestPromptIdentity(@Query('taskNumber') taskNumber: string) {
    const n = Number(taskNumber);
    if (!n) throw new BadRequestException('taskNumber is required');
    return this.practiceContent.suggestNextPromptIdentity(n);
  }

  @Get('writing-prompts/:id')
  getWritingPrompt(@Param('id') id: string) {
    return this.practiceContent.getWritingPrompt(id);
  }

  @Post('writing-prompts')
  createWritingPrompt(
    @Body()
    body: {
      code: string;
      title: string;
      taskNumber: number;
      instruction: string;
      minWords?: number;
      imageUrl?: string;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.practiceContent.createWritingPrompt(body, user.id);
  }

  @Patch('writing-prompts/:id')
  updateWritingPrompt(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      instruction?: string;
      minWords?: number;
      imageUrl?: string;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.practiceContent.updateWritingPrompt(id, body, user.id);
  }

  @Post('writing-prompts/:id/publish')
  publishWritingPrompt(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.practiceContent.publishWritingPrompt(id, user.id);
  }

  @Post('writing-prompts/:id/archive')
  archiveWritingPrompt(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.practiceContent.archiveWritingPrompt(id, user.id);
  }
}
