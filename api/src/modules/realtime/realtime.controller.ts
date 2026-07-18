import {
  Controller,
  ForbiddenException,
  MessageEvent,
  NotFoundException,
  Param,
  Sse,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { TeachersService } from '../teachers/teachers.service';
import { RealtimeService } from './realtime.service';
import type { RealtimeEvent } from './realtime.types';

function sse(data: unknown): MessageEvent {
  return { data: JSON.stringify(data) };
}

@ApiTags('realtime')
@ApiBearerAuth()
@Controller()
export class RealtimeController {
  constructor(
    private realtime: RealtimeService,
    private admin: AdminService,
    private teachers: TeachersService,
    private prisma: PrismaService,
  ) {}

  @Sse('admin/sessions/live/stream')
  @Roles(UserRole.ADMIN)
  adminLiveMonitorStream(@CurrentUser() user: RequestUser): Observable<MessageEvent> {
    const slotKey = `admin:live:${user.id}`;

    const event$ = new Observable<MessageEvent>((subscriber) => {
      const pushSnapshot = async (reason: string) => {
        try {
          const sessions = await this.admin.getLiveSessions();
          subscriber.next(
            sse({
              type: 'snapshot',
              reason,
              serverTime: new Date().toISOString(),
              sessions,
            }),
          );
        } catch {
          subscriber.next(sse({ type: 'error', message: 'snapshot_failed' }));
        }
      };

      void pushSnapshot('connect');
      const unsubEvents = this.realtime.subscribe((event: RealtimeEvent) => {
        if (event.type === 'admin:live-monitor') {
          void pushSnapshot(event.reason);
        }
      });
      const tick = setInterval(() => void pushSnapshot('tick'), 5_000);

      const releaseSlot = this.realtime.claimStreamSlot(slotKey, () => {
        clearInterval(tick);
        unsubEvents();
        subscriber.complete();
      });

      return () => {
        clearInterval(tick);
        unsubEvents();
        releaseSlot();
      };
    });

    return merge(
      event$,
      interval(25_000).pipe(map(() => sse({ type: 'heartbeat' }))),
    );
  }

  @Sse('teachers/nav-badges/stream')
  @Roles(UserRole.TEACHER)
  teacherBadgesStream(@CurrentUser() user: RequestUser): Observable<MessageEvent> {
    const teacherId = user.teacherProfileId;
    if (!teacherId) {
      throw new ForbiddenException('Teacher profile required');
    }

    const slotKey = `teacher:badges:${user.id}`;

    return new Observable<MessageEvent>((subscriber) => {
      const pushCounts = async (reason: string) => {
        try {
          const counts = await this.teachers.getNavBadgeCounts(user);
          subscriber.next(
            sse({
              type: 'badges',
              reason,
              serverTime: new Date().toISOString(),
              ...counts,
            }),
          );
        } catch {
          subscriber.next(sse({ type: 'error', message: 'badges_failed' }));
        }
      };

      void pushCounts('connect');
      const unsubEvents = this.realtime.subscribe((event: RealtimeEvent) => {
        if (event.type === 'teacher:badges' && event.teacherId === teacherId) {
          void pushCounts('event');
        }
      });
      const tick = setInterval(() => void pushCounts('tick'), 30_000);

      const releaseSlot = this.realtime.claimStreamSlot(slotKey, () => {
        clearInterval(tick);
        unsubEvents();
        subscriber.complete();
      });

      return () => {
        clearInterval(tick);
        unsubEvents();
        releaseSlot();
      };
    });
  }

  @Sse('exam-sessions/:sessionCode/events/stream')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  examEventsStream(
    @Param('sessionCode') sessionCode: string,
    @CurrentUser() user: RequestUser,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let cleaned = false;
      let cleanup = () => {};

      void (async () => {
        try {
          const session = await this.prisma.examSession.findUnique({
            where: { sessionCode },
            select: { sessionCode: true, state: true, enrollment: { select: { studentId: true } } },
          });
          if (!session) throw new NotFoundException('Session not found');
          if (
            user.role !== UserRole.ADMIN &&
            user.studentProfileId !== session.enrollment.studentId
          ) {
            throw new ForbiddenException('Access denied');
          }
          if (cleaned) return;

          subscriber.next(
            sse({
              type: 'connected',
              sessionCode,
              state: session.state.toLowerCase(),
            }),
          );

          const slotKey = `exam:${user.id}:${sessionCode}`;
          const unsubEvents = this.realtime.subscribe((event: RealtimeEvent) => {
            if (
              (event.type === 'exam:section-submitted' ||
                event.type === 'exam:integrity' ||
                event.type === 'exam:state' ||
                event.type === 'exam:suspended' ||
                event.type === 'exam:resumed') &&
              event.sessionCode === sessionCode
            ) {
              subscriber.next(sse(event));
            }
          });
          const tick = setInterval(() => {
            subscriber.next(sse({ type: 'heartbeat', sessionCode }));
          }, 25_000);

          const releaseSlot = this.realtime.claimStreamSlot(slotKey, () => {
            clearInterval(tick);
            unsubEvents();
            subscriber.complete();
          });

          cleanup = () => {
            clearInterval(tick);
            unsubEvents();
            releaseSlot();
          };
        } catch (err) {
          subscriber.error(err);
        }
      })();

      return () => {
        cleaned = true;
        cleanup();
      };
    });
  }
}
