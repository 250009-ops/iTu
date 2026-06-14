export const adminDashboardMeta = {
  date: "June 12, 2026",
  status: "Platform operational",
  lastSync: "2 min ago",
  disputeAlert: "2 disputes need attention",
};

export const adminStats = [
  {
    id: "exams",
    label: "Active Exams Now",
    value: "5",
    sub: "3 CBT · 2 Speaking",
    live: true,
    tone: "navy" as const,
  },
  {
    id: "revenue",
    label: "Revenue MTD",
    value: "$7,600",
    sub: "June 2026",
    trend: "+18.4%",
    tone: "emerald" as const,
  },
  {
    id: "teachers",
    label: "Active Teachers",
    value: "12",
    sub: "2 online now",
    trend: "+2 this month",
    tone: "violet" as const,
  },
  {
    id: "disputes",
    label: "Open Disputes",
    value: "2",
    sub: "1 urgent · 1 high",
    trend: "-1 from yesterday",
    trendNegative: true,
    tone: "amber" as const,
  },
];

export const monthlyRevenue = [
  { month: "Jan", amount: 8200 },
  { month: "Feb", amount: 9100 },
  { month: "Mar", amount: 8800 },
  { month: "Apr", amount: 10200 },
  { month: "May", amount: 13400 },
  { month: "Jun", amount: 7600 },
];

export const completionRates = [
  { skill: "Listening", pct: 87, color: "sky" as const },
  { skill: "Reading", pct: 82, color: "emerald" as const },
  { skill: "Writing", pct: 76, color: "violet" as const },
  { skill: "Speaking", pct: 79, color: "rose" as const },
];

export type LiveSkill =
  | "speaking"
  | "writing"
  | "listening"
  | "reading";

export const liveSessions = [
  {
    id: "1",
    studentName: "Alex Johnson",
    country: "UK",
    initials: "AJ",
    skill: "Speaking (Part 2)" as const,
    skillType: "speaking" as LiveSkill,
    progress: 56,
    timeLeft: "08:42",
    examiner: "Dr. Emma Williams",
    integrity: "clear" as const,
    flags: 0,
  },
  {
    id: "2",
    studentName: "Maria Santos",
    country: "BR",
    initials: "MS",
    skill: "Writing (Task 2)" as const,
    skillType: "writing" as LiveSkill,
    progress: 43,
    timeLeft: "34:15",
    examiner: "Auto-graded",
    integrity: "flagged" as const,
    flags: 1,
  },
  {
    id: "3",
    studentName: "Kai Chen",
    country: "CN",
    initials: "KC",
    skill: "Listening (Part 3)" as const,
    skillType: "listening" as LiveSkill,
    progress: 69,
    timeLeft: "12:30",
    examiner: "Auto-graded",
    integrity: "clear" as const,
    flags: 0,
  },
  {
    id: "4",
    studentName: "Priya Sharma",
    country: "IN",
    initials: "PS",
    skill: "Reading (Part 1)" as const,
    skillType: "reading" as LiveSkill,
    progress: 25,
    timeLeft: "45:22",
    examiner: "Auto-graded",
    integrity: "flagged" as const,
    flags: 2,
  },
  {
    id: "5",
    studentName: "James Park",
    country: "KR",
    initials: "JP",
    skill: "Speaking (Part 1)" as const,
    skillType: "speaking" as LiveSkill,
    progress: 84,
    timeLeft: "03:15",
    examiner: "Dr. David Kim",
    integrity: "clear" as const,
    flags: 0,
  },
];
