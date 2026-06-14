import { Module } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';

@Module({
  controllers: [SpeakingController],
  providers: [SpeakingService, LivekitService],
  exports: [SpeakingService, LivekitService],
})
export class SpeakingModule {}
