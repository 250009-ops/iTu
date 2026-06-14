export type TimelineStatus = "completed" | "current" | "upcoming";

export type SectionStatus =
  | "completed"
  | "submitted"
  | "ready"
  | "locked"
  | "in_progress";

export const mockDaySession = {
  dateLabel: "June 12, 2026",
  examTitle: "Full Academic Mock",
  mockId: "MOCK 005",
  progressPct: 100,
  modulesComplete: 4,
  totalModules: 4,
  speakingExaminer: "Dr. Emma Williams",
  countdown: { hours: 1, minutes: 47, seconds: 33 },
  currentPhase: {
    label: "Lunch Break",
    badge: "LUNCH BREAK · ACTIVE",
    headline: "Speaking starts at 14:00 · Dr. Emma Williams",
    message:
      "Return to this hub by 13:45 for your pre-speaking check-in. Ensure microphone and webcam are active.",
  },
  moduleRail: [
    { key: "listening", label: "Listening", value: "36/40", done: true },
    { key: "reading", label: "Reading", value: "32/40", done: true },
    { key: "writing", label: "Writing", value: "Submitted", done: true },
    { key: "speaking", label: "Speaking", value: "14:00", done: false },
  ],
  rules: [
    "Fullscreen required for all sections",
    "No pause/rewind in Listening",
    "All sections must be completed today",
    "Do not navigate away mid-section",
  ],
  schedule: [
    { id: "checkin", title: "Check-in", detail: "Identity verification", time: "08:15", status: "completed" as TimelineStatus, isBreak: false },
    { id: "listening", title: "Listening", detail: "40 min", time: "08:45", status: "completed" as TimelineStatus, isBreak: false },
    { id: "break1", title: "Break", detail: "10 min", time: "09:35", status: "completed" as TimelineStatus, isBreak: true },
    { id: "reading", title: "Reading", detail: "60 min", time: "09:45", status: "completed" as TimelineStatus, isBreak: false },
    { id: "break2", title: "Break", detail: "10 min", time: "10:55", status: "completed" as TimelineStatus, isBreak: true },
    { id: "writing", title: "Writing", detail: "60 min", time: "11:05", status: "completed" as TimelineStatus, isBreak: false },
    { id: "lunch", title: "Lunch", detail: "~2 hr break", time: "12:05", status: "current" as TimelineStatus, isBreak: true },
    { id: "speaking", title: "Speaking", detail: "20 min", time: "14:00", status: "upcoming" as TimelineStatus, isBreak: false },
  ],
  sections: [
    {
      id: "listening",
      name: "Listening",
      status: "completed" as SectionStatus,
      detail: "40 questions · 40 min · 4 parts",
      timeRange: "08:45 – 09:25",
      color: "#2563EB",
      result: { score: "36/40", label: "Correct", delta: "+2 vs prev" },
    },
    {
      id: "reading",
      name: "Reading",
      status: "completed" as SectionStatus,
      detail: "40 questions · 60 min · 3 passages",
      timeRange: "09:45 – 10:45",
      color: "#059669",
      result: { score: "32/40", label: "Correct", band: "Band est. 7.0" },
    },
    {
      id: "writing",
      name: "Writing",
      status: "submitted" as SectionStatus,
      detail: "Task 1 (report) + Task 2 (essay) · 60 min",
      timeRange: "11:05 – 12:05",
      color: "#7C3AED",
      result: { status: "Submitted", sub: "Awaiting grading", examiner: "Dr. Sarah Chen" },
    },
  ],
  speaking: {
    status: "ready" as SectionStatus,
    detail: "1-on-1 live interview · Parts 1, 2 & 3 · ~20 minutes total",
    timeRange: "14:00 – 14:20",
    examiner: "Dr. Emma Williams",
    examinerTitle: "Speaking Examiner · IELTS Certified",
    checklist: [
      { label: "Identity verified", done: false },
      { label: "Diagnostics passed", done: false },
      { label: "Rules acknowledged", done: false },
      { label: "Mic & camera ready", done: true },
    ],
  },
  checkIn: {
    title: "Check-in Required",
    description: "Complete before 13:45 to access the speaking session.",
    actionLabel: "Start Check-in",
  },
  speakingTip:
    "For Part 3, use hedging language — \"I would argue that...\", \"It seems to me that...\" — to handle abstract questions fluently without long pauses.",
};
