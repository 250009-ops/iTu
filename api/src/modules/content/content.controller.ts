import {
  BadRequestException,
  Body,
  Controller,
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

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

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

  @Patch('tests/:id')
  updateTest(
    @Param('id') id: string,
    @Body() body: UpdateContentTestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.content.updateTest(id, body, user.id);
  }

  @Post('tests/:id/media')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AUDIO_BYTES },
    }),
  )
  uploadMedia(
    @Param('id') id: string,
    @Query('key') key: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!key?.trim()) {
      throw new BadRequestException('Query parameter "key" is required (e.g. part-1)');
    }
    return this.content.uploadMedia(id, key.trim(), file, user.id);
  }
}
