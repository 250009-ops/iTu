import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
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
}
