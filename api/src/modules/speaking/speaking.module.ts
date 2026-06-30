import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { LivekitService } from './livekit.service';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';

@Module({
  imports: [SettingsModule],
  controllers: [SpeakingController],
  providers: [SpeakingService, LivekitService],
  exports: [SpeakingService, LivekitService],
})
export class SpeakingModule {}
