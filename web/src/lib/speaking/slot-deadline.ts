import { SPEAKING_SLOT_DURATION_MINUTES } from "@/lib/speaking/slot-access";

export function speakingSlotEndAt(
  scheduledAt: string | Date | null | undefined,
  durationMin = SPEAKING_SLOT_DURATION_MINUTES,
): Date | null {
  if (!scheduledAt) return null;
  return new Date(
    new Date(scheduledAt).getTime() + durationMin * 60_000,
  );
}

export function speakingSlotRemainingSec(
  scheduledAt: string | Date | null | undefined,
  now = Date.now(),
  durationMin = SPEAKING_SLOT_DURATION_MINUTES,
): number | null {
  const end = speakingSlotEndAt(scheduledAt, durationMin);
  if (!end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now) / 1000));
}

export function speakingSlotWarnAt(
  scheduledAt: string | Date | null | undefined,
  durationMin = SPEAKING_SLOT_DURATION_MINUTES,
): Date | null {
  const end = speakingSlotEndAt(scheduledAt, durationMin);
  if (!end) return null;
  return new Date(end.getTime() - 60_000);
}
