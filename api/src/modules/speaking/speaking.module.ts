import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { SettingsModule } from '../settings/settings.module';
import { LivekitService } from './livekit.service';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';

@Module({
  imports: [SettingsModule, BookingsModule],
  controllers: [SpeakingController],
  providers: [SpeakingService, LivekitService],
  exports: [SpeakingService, LivekitService],
})
export class SpeakingModule {}
