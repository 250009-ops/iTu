import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import {
  InstitutionMockSetsService,
  type MockSetSelectionInput,
} from './institution-mock-sets.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/institution-mock-sets')
@Roles(UserRole.ADMIN)
export class InstitutionMockSetsAdminController {
  constructor(private readonly service: InstitutionMockSetsService) {}

  @Get()
  list() {
    return this.service.listSets();
  }

  @Get('content-options')
  listContentOptions(@Query('excludeSetId') excludeSetId?: string) {
    return this.service.listContentOptions(excludeSetId?.trim());
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getSet(id);
  }

  @Post()
  create(
    @Body()
    body: {
      slug: string;
      title: string;
      description?: string;
      isActive?: boolean;
    } & MockSetSelectionInput,
    @CurrentUser() user: RequestUser,
  ) {
    const { slug, title, description, isActive, ...selection } = body;
    return this.service.createSet(
      { slug, title, description, isActive },
      selection,
      user.id,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      slug?: string;
      title?: string;
      description?: string | null;
      isActive?: boolean;
    } & MockSetSelectionInput,
    @CurrentUser() user: RequestUser,
  ) {
    const {
      slug,
      title,
      description,
      isActive,
      packageIds,
      listeningIds,
      readingIds,
      writingIds,
    } = body;
    const hasSelection =
      packageIds != null ||
      listeningIds != null ||
      readingIds != null ||
      writingIds != null;
    return this.service.updateSet(
      id,
      { slug, title, description, isActive },
      hasSelection
        ? { packageIds, listeningIds, readingIds, writingIds }
        : undefined,
      user.id,
    );
  }
}
