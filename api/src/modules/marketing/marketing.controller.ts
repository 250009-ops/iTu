import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { InstitutionApplicationDto } from './dto/institution-application.dto';
import { JoinCenterDto } from './dto/join-center.dto';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private marketing: MarketingService) {}

  @Public()
  @Get('stats')
  getStats() {
    return this.marketing.getStats();
  }

  @Public()
  @Post('institution-application')
  @HttpCode(200)
  submitInstitutionApplication(@Body() dto: InstitutionApplicationDto) {
    return this.marketing.createInstitutionApplication(dto);
  }

  @Public()
  @Get('leaderboard')
  getLeaderboard() {
    return this.marketing.getLeaderboard();
  }

  @Public()
  @Get('testimonials')
  getTestimonials() {
    return this.marketing.getTestimonials();
  }

  @Public()
  @Get('teachers')
  getTeachers(@Query('speciality') speciality?: 'writing' | 'speaking' | 'both') {
    return this.marketing.getTeachers(speciality);
  }

  @Public()
  @Get('teachers/:slug')
  getTeacher(@Param('slug') slug: string) {
    return this.marketing.getTeacher(slug);
  }

  @Public()
  @Get('partner-onboarding')
  getPartnerOnboarding() {
    return this.marketing.getPartnerOnboarding();
  }

  @Public()
  @Get('centers')
  getCenters() {
    return this.marketing.getCenters();
  }

  @Public()
  @Get('centers/:slug')
  getCenter(@Param('slug') slug: string) {
    return this.marketing.getCenter(slug);
  }

  @Public()
  @Post('centers/:slug/join')
  @HttpCode(200)
  joinCenter(@Param('slug') slug: string, @Body() dto: JoinCenterDto) {
    return this.marketing.joinCenter(slug, dto);
  }
}
