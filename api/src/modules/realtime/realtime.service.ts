import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import {
  REALTIME_REDIS_CHANNEL,
  type RealtimeEvent,
} from './realtime.types';

type Listener = (event: RealtimeEvent) => void;

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly local = new EventEmitter();
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  /** One active stream per user+channel — closes stale connections. */
  private readonly streamSlots = new Map<string, () => void>();

  constructor(private config: ConfigService) {
    this.local.setMaxListeners(100);
  }

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) return;

    try {
      this.publisher = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
      this.subscriber = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
      await this.publisher.connect();
      await this.subscriber.connect();
      await this.subscriber.subscribe(REALTIME_REDIS_CHANNEL);
      this.subscriber.on('message', (_channel, payload) => {
        try {
          const event = JSON.parse(payload) as RealtimeEvent;
          this.local.emit('event', event);
        } catch {
          // ignore malformed payloads
        }
      });
      this.logger.log('Realtime Redis pub/sub connected');
    } catch (err) {
      this.logger.warn(
        `Realtime Redis unavailable — using in-process events only: ${
          err instanceof Error ? err.message : err
        }`,
      );
      this.publisher?.disconnect();
      this.subscriber?.disconnect();
      this.publisher = null;
      this.subscriber = null;
    }
  }

  async onModuleDestroy() {
    for (const close of this.streamSlots.values()) {
      close();
    }
    this.streamSlots.clear();
    await this.subscriber?.quit();
    await this.publisher?.quit();
  }

  publish(event: RealtimeEvent) {
    this.local.emit('event', event);
    if (this.publisher) {
      void this.publisher.publish(REALTIME_REDIS_CHANNEL, JSON.stringify(event));
    }
  }

  subscribe(listener: Listener): () => void {
    this.local.on('event', listener);
    return () => this.local.off('event', listener);
  }

  /** Replace any existing stream for this slot (prevents concurrent duplicate tabs). */
  claimStreamSlot(slotKey: string, close: () => void) {
    const existing = this.streamSlots.get(slotKey);
    existing?.();
    this.streamSlots.set(slotKey, close);
    return () => {
      if (this.streamSlots.get(slotKey) === close) {
        this.streamSlots.delete(slotKey);
      }
    };
  }

  notifyAdminLiveMonitor(reason: string) {
    this.publish({ type: 'admin:live-monitor', reason });
  }

  notifyTeacherBadges(teacherId: string) {
    this.publish({ type: 'teacher:badges', teacherId });
  }

  notifyExamSectionSubmitted(sessionCode: string, skill: string) {
    this.publish({ type: 'exam:section-submitted', sessionCode, skill });
    this.notifyAdminLiveMonitor('section-submitted');
  }

  notifyExamIntegrity(sessionCode: string, integrity: string) {
    this.publish({ type: 'exam:integrity', sessionCode, integrity });
    this.notifyAdminLiveMonitor('integrity');
  }

  notifyExamState(sessionCode: string, state: string) {
    this.publish({ type: 'exam:state', sessionCode, state });
    this.notifyAdminLiveMonitor('state-change');
  }

  notifyExamSuspended(sessionCode: string, reason: string) {
    this.publish({ type: 'exam:suspended', sessionCode, reason });
    this.notifyAdminLiveMonitor('session-suspended');
  }

  notifyExamResumed(sessionCode: string) {
    this.publish({ type: 'exam:resumed', sessionCode });
    this.notifyAdminLiveMonitor('session-resumed');
  }
}
