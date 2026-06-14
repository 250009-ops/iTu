export type LifecycleStatus =
  | "in_progress"
  | "awaiting_results"
  | "complete";

export type ModuleKey = "listening" | "reading" | "writing" | "speaking";

export type Enrollment = {
  id: string;
  enrollmentId: string;
  studentName: string;
  initials: string;
  targetBand: number;
  country: string;
  examDate: string;
  examTime: string;
  completedModules: ModuleKey[];
  speakingExaminer: string;
  speakingExaminerInitials: string;
  writingExaminer: string;
  writingExaminerInitials: string;
  lifecycle: LifecycleStatus;
};

export const enrollmentsSummary = {
  total: 5,
  period: "June 2026",
  activeExams: 2,
  awaitingResults: 1,
  completed: 2,
};

export const lifecyclePipeline = [
  { stage: "Enrolled", count: 5, pct: 100, sublabel: "5 Enrolled", tone: "navy" as const },
  { stage: "In Progress", count: 2, pct: 40, sublabel: "2 In Progress", tone: "sky" as const },
  { stage: "Awaiting Results", count: 1, pct: 20, sublabel: "1 Awaiting Results", tone: "amber" as const },
  { stage: "Completed", count: 2, pct: 40, sublabel: "2 Completed", tone: "emerald" as const },
];

export const allModules: ModuleKey[] = [
  "listening",
  "reading",
  "writing",
  "speaking",
];

export const enrollments: Enrollment[] = [
  {
    id: "1",
    enrollmentId: "ENR-3041",
    studentName: "Alex Johnson",
    initials: "AJ",
    targetBand: 7.0,
    country: "UK",
    examDate: "Jun 14, 2026",
    examTime: "09:00",
    completedModules: ["listening", "reading"],
    speakingExaminer: "Dr. Sarah Chen",
    speakingExaminerInitials: "SC",
    writingExaminer: "Emma Williams",
    writingExaminerInitials: "EW",
    lifecycle: "in_progress",
  },
  {
    id: "2",
    enrollmentId: "ENR-3040",
    studentName: "Maria Santos",
    initials: "MS",
    targetBand: 6.5,
    country: "BR",
    examDate: "Jun 14, 2026",
    examTime: "09:00",
    completedModules: ["listening"],
    speakingExaminer: "James Morrison",
    speakingExaminerInitials: "JM",
    writingExaminer: "Dr. David Kim",
    writingExaminerInitials: "DK",
    lifecycle: "in_progress",
  },
  {
    id: "3",
    enrollmentId: "ENR-3035",
    studentName: "Kai Chen",
    initials: "KC",
    targetBand: 7.5,
    country: "CN",
    examDate: "Jun 5, 2026",
    examTime: "08:15",
    completedModules: ["listening", "reading", "writing", "speaking"],
    speakingExaminer: "Dr. Sarah Chen",
    speakingExaminerInitials: "SC",
    writingExaminer: "Emma Williams",
    writingExaminerInitials: "EW",
    lifecycle: "complete",
  },
  {
    id: "4",
    enrollmentId: "ENR-3029",
    studentName: "Priya Sharma",
    initials: "PS",
    targetBand: 7.0,
    country: "IN",
    examDate: "Jun 1, 2026",
    examTime: "08:15",
    completedModules: ["listening", "reading", "writing", "speaking"],
    speakingExaminer: "Aisha Patel",
    speakingExaminerInitials: "AP",
    writingExaminer: "Dr. Sarah Chen",
    writingExaminerInitials: "SC",
    lifecycle: "complete",
  },
  {
    id: "5",
    enrollmentId: "ENR-3022",
    studentName: "James Park",
    initials: "JP",
    targetBand: 6.5,
    country: "KR",
    examDate: "Jun 8, 2026",
    examTime: "08:15",
    completedModules: ["listening", "reading", "writing", "speaking"],
    speakingExaminer: "Dr. David Kim",
    speakingExaminerInitials: "DK",
    writingExaminer: "Aisha Patel",
    writingExaminerInitials: "AP",
    lifecycle: "awaiting_results",
  },
];

export const moduleBadges: Record<
  ModuleKey,
  { label: string; className: string }
> = {
  listening: { label: "L", className: "bg-sky-500 text-white" },
  reading: { label: "R", className: "bg-emerald-500 text-white" },
  writing: { label: "W", className: "bg-violet-500 text-white" },
  speaking: { label: "S", className: "bg-rose-500 text-white" },
};

export const lifecycleFilterOptions: {
  value: "all" | LifecycleStatus;
  label: string;
}[] = [
  { value: "all", label: "All Status" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_results", label: "Awaiting Results" },
  { value: "complete", label: "Complete" },
];
