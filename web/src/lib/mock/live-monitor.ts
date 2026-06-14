import { liveSessions } from "@/lib/mock/admin-dashboard";

export { liveSessions, type LiveSkill } from "@/lib/mock/admin-dashboard";

export const liveMonitorMeta = {
  sessionsRunning: 5,
  flaggedCount: 2,
  avgTimeRemaining: "20.5m",
  withExaminer: 2,
  flaggedStudents: ["Maria Santos", "Priya Sharma"],
};

export const monitorSummary = [
  {
    id: "active",
    label: "Active Sessions",
    value: String(liveMonitorMeta.sessionsRunning),
    icon: "activity" as const,
    tone: "sky" as const,
  },
  {
    id: "flagged",
    label: "Flagged",
    value: String(liveMonitorMeta.flaggedCount),
    icon: "alert" as const,
    tone: "rose" as const,
  },
  {
    id: "time",
    label: "Avg Time Remaining",
    value: liveMonitorMeta.avgTimeRemaining,
    icon: "clock" as const,
    tone: "amber" as const,
  },
  {
    id: "examiner",
    label: "With Examiner",
    value: String(liveMonitorMeta.withExaminer),
    icon: "user" as const,
    tone: "violet" as const,
  },
];
