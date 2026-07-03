import type { mapTeacherSpeakingSessions } from "@/lib/api/mappers/teacher";

type Hub = ReturnType<typeof mapTeacherSpeakingSessions>;
type SessionItem = Hub["today"][number];

export function pickNextSpeakingSession(
  hub: Hub,
  currentSessionId: string,
  currentScheduledAt: string | null | undefined,
): SessionItem | null {
  const currentStart = currentScheduledAt
    ? new Date(currentScheduledAt).getTime()
    : 0;
  const pool = [...hub.today, ...hub.upcoming];

  return (
    pool
      .filter(
        (s) =>
          s.id !== currentSessionId &&
          s.scheduledAt &&
          (s.uiStatus === "upcoming" || s.uiStatus === "live"),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime(),
      )
      .find((s) => new Date(s.scheduledAt!).getTime() >= currentStart) ?? null
  );
}
