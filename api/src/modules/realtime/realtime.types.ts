export type RealtimeEvent =
  | { type: 'admin:live-monitor'; reason: string }
  | { type: 'teacher:badges'; teacherId: string }
  | {
      type: 'exam:section-submitted';
      sessionCode: string;
      skill: string;
    }
  | {
      type: 'exam:integrity';
      sessionCode: string;
      integrity: string;
    }
  | { type: 'exam:state'; sessionCode: string; state: string };

export const REALTIME_REDIS_CHANNEL = 'itestu:realtime';
