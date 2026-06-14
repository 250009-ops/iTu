import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContentTestType, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContentService } from './content.service';

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
  ) {
    return this.content.createTest(body);
  }

  @Post('tests/:id/publish')
  publishTest(@Param('id') id: string) {
    return this.content.publishTest(id);
  }
}
