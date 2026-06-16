import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
} from 'livekit-server-sdk';

export type SpeakingRoomRole = 'examiner' | 'student';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('LIVEKIT_URL') &&
        this.config.get<string>('LIVEKIT_API_KEY') &&
        this.config.get<string>('LIVEKIT_API_SECRET'),
    );
  }

  isRecordingEnabled(): boolean {
    return (
      this.isConfigured() &&
      this.config.get<string>('LIVEKIT_RECORDING_ENABLED', 'true') !== 'false'
    );
  }

  roomNameForSession(speakingSessionId: string): string {
    return `speaking-${speakingSessionId}`;
  }

  speakingSessionIdFromRoom(roomName: string): string | null {
    const prefix = 'speaking-';
    return roomName.startsWith(prefix) ? roomName.slice(prefix.length) : null;
  }

  async createJoinToken(params: {
    roomName: string;
    identity: string;
    name: string;
    role: SpeakingRoomRole;
  }): Promise<{ token: string; serverUrl: string; roomName: string }> {
    const serverUrl = this.config.get<string>('LIVEKIT_URL');
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');

    if (!serverUrl || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in api/.env',
      );
    }

    const isExaminer = params.role === 'examiner';
    const token = new AccessToken(apiKey, apiSecret, {
      identity: params.identity,
      name: params.name,
      metadata: JSON.stringify({ role: params.role }),
      ttl: '2h',
    });

    token.addGrant({
      room: params.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: isExaminer,
      roomAdmin: isExaminer,
      roomRecord: isExaminer,
    });

    return {
      token: await token.toJwt(),
      serverUrl,
      roomName: params.roomName,
    };
  }

  async startRoomRecording(
    roomName: string,
    speakingSessionId: string,
  ): Promise<string | null> {
    if (!this.isRecordingEnabled()) return null;

    try {
      const client = this.egressClient();
      const output = this.buildFileOutput(speakingSessionId);
      const info = await client.startRoomCompositeEgress(
        roomName,
        { file: output },
        {
          layout: 'grid',
          encodingOptions: EncodingOptionsPreset.H264_720P_30,
        },
      );
      return info.egressId || null;
    } catch (err) {
      this.logger.warn(
        `Failed to start recording for ${roomName}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  async stopRoomRecording(egressId: string): Promise<string | null> {
    if (!this.isConfigured() || !egressId) return null;

    try {
      const client = this.egressClient();
      await client.stopEgress(egressId);
      return await this.resolveRecordingUrl(egressId);
    } catch (err) {
      this.logger.warn(
        `Failed to stop recording ${egressId}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  async resolveRecordingUrl(egressId: string): Promise<string | null> {
    const client = this.egressClient();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const items = await client.listEgress({ egressId });
      const location = items[0]?.fileResults?.[0]?.location;
      if (location) return location;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return null;
  }

  private egressClient(): EgressClient {
    const apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');
    return new EgressClient(this.httpHost(), apiKey, apiSecret);
  }

  private httpHost(): string {
    const url = this.config.getOrThrow<string>('LIVEKIT_URL');
    return url.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
  }

  private buildFileOutput(speakingSessionId: string): EncodedFileOutput {
    const filepath = `ielts-speaking/${speakingSessionId}.mp4`;
    // LiveKit Cloud stores the file; the API mirrors it to VPS disk when MEDIA_* is set.
    return new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
    });
  }
}
