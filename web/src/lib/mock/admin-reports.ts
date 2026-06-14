export type ReportTimeframe = "jun" | "q2" | "ytd";

export const reportsSummary = {
  revenueMtd: 7600,
  revenueTrend: "+18%",
  examsDelivered: 152,
  examsPeriod: "June 2026",
  examsTrend: "+14%",
  avgBandScore: 6.3,
  avgBandSub: "All modules combined",
  avgBandTrend: "+0.2",
  satisfaction: 94,
  satisfactionSub: "1,247 ratings",
  satisfactionTrend: "+3%",
};

export const revenueExamVolume = [
  { month: "Jan", revenue: 8200, exams: 178 },
  { month: "Feb", revenue: 9100, exams: 192 },
  { month: "Mar", revenue: 8800, exams: 205 },
  { month: "Apr", revenue: 10200, exams: 228 },
  { month: "May", revenue: 13400, exams: 265 },
  { month: "Jun", revenue: 7600, exams: 152 },
];

export const bandScoreDistribution = [
  { score: "5.0", count: 18, highlight: false },
  { score: "5.5", count: 42, highlight: false },
  { score: "6.0", count: 78, highlight: false },
  { score: "6.5", count: 124, highlight: true },
  { score: "7.0", count: 118, highlight: true },
  { score: "7.5", count: 38, highlight: false },
  { score: "8.0", count: 12, highlight: false },
];

export const enrollmentFunnel = [
  { month: "Jan", enrolled: 198, completed: 162 },
  { month: "Feb", enrolled: 214, completed: 178 },
  { month: "Mar", enrolled: 208, completed: 171 },
  { month: "Apr", enrolled: 232, completed: 196 },
  { month: "May", enrolled: 268, completed: 228 },
  { month: "Jun", enrolled: 152, completed: 118 },
];

export type ModuleKey = "listening" | "reading" | "writing" | "speaking";

export const modulePerformance = [
  {
    module: "listening" as ModuleKey,
    label: "Listening",
    exams: 892,
    avgBand: 6.8,
    passRate: 87,
    mom: 1.2,
  },
  {
    module: "reading" as ModuleKey,
    label: "Reading",
    exams: 756,
    avgBand: 6.5,
    passRate: 82,
    mom: 0.8,
  },
  {
    module: "writing" as ModuleKey,
    label: "Writing",
    exams: 312,
    avgBand: 5.9,
    passRate: 76,
    mom: 2.1,
  },
  {
    module: "speaking" as ModuleKey,
    label: "Speaking",
    exams: 312,
    avgBand: 6.2,
    passRate: 79,
    mom: 3.4,
  },
];

export const moduleBadgeStyles: Record<ModuleKey, string> = {
  listening: "bg-sky-50 text-sky-700",
  reading: "bg-emerald-50 text-emerald-700",
  writing: "bg-violet-50 text-violet-700",
  speaking: "bg-rose-50 text-rose-700",
};

export const teacherLeaderboard = [
  {
    rank: 1,
    name: "Emma Williams",
    initials: "EW",
    status: "Active examiner",
    speciality: "Speaking",
    specialityTone: "rose" as const,
    sessions: 2103,
    rating: 4.9,
    totalEarned: 21500,
    mom: 12,
  },
  {
    rank: 2,
    name: "Dr. Sarah Chen",
    initials: "SC",
    status: "Active examiner",
    speciality: "Writing",
    specialityTone: "violet" as const,
    sessions: 1247,
    rating: 4.9,
    totalEarned: 14890,
    mom: 8,
  },
  {
    rank: 3,
    name: "Aisha Patel",
    initials: "AP",
    status: "Active examiner",
    speciality: "Writing",
    specialityTone: "violet" as const,
    sessions: 631,
    rating: 4.8,
    totalEarned: 7200,
    mom: 5,
  },
  {
    rank: 4,
    name: "Dr. David Kim",
    initials: "DK",
    status: "Active examiner",
    speciality: "Speaking",
    specialityTone: "rose" as const,
    sessions: 580,
    rating: 4.7,
    totalEarned: 6800,
    mom: 3,
  },
];

export const specialityPillStyles = {
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
};
