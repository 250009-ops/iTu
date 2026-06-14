export const teacherUser = {
  name: "Dr. Sarah Chen",
  shortName: "Dr. Chen",
  initials: "DS",
  role: "Teacher",
};

export const teacherStats = [
  {
    id: "sessions",
    label: "Today's Sessions",
    value: "2",
    sub: "14:00 & 14:40",
    trend: null,
    tone: "sky" as const,
  },
  {
    id: "writing",
    label: "Pending Writing",
    value: "4",
    sub: "SLA: 8 hrs avg",
    trend: "+2",
    tone: "violet" as const,
  },
  {
    id: "earnings",
    label: "This Month",
    value: "$760",
    sub: "Jun earnings",
    trend: "+12%",
    tone: "emerald" as const,
  },
  {
    id: "rating",
    label: "Rating",
    value: "4.9",
    sub: "247 reviews",
    trend: null,
    tone: "amber" as const,
  },
];

export const speakingSchedule = [
  {
    id: "1",
    studentName: "Alex Johnson",
    initials: "AJ",
    timeRange: "14:00 – 14:20",
    sessionType: "Speaking Part 1–3",
    status: "upcoming" as const,
  },
  {
    id: "2",
    studentName: "Maria Santos",
    initials: "MS",
    timeRange: "14:40 – 15:00",
    sessionType: "Speaking Part 1–3",
    status: "upcoming" as const,
  },
];

export const writingQueue = [
  {
    id: "1",
    studentName: "Emma Williams",
    date: "Jun 12",
    status: "pending" as const,
    slaHours: 4,
    urgent: true,
  },
  {
    id: "2",
    studentName: "David Kim",
    date: "Jun 12",
    status: "pending" as const,
    slaHours: 6,
    urgent: true,
  },
  {
    id: "3",
    studentName: "Layla Hassan",
    date: "Jun 11",
    status: "in_review" as const,
    slaHours: 8,
    urgent: false,
  },
];
