export const studentUser = {
  name: "Alex Johnson",
  initials: "AJ",
  role: "Student",
  targetBand: 7.0,
  examType: "Academic" as const,
  mocksCompleted: 3,
  mocksRemaining: 2,
  currentBestBand: 7.0,
  bandImprovement: 0.5,
  targetAchieved: true,
};

export const upcomingMock = {
  date: new Date("2025-06-12T08:15:00"),
  label: "June 12, 2025",
  type: "Full Academic Mock",
  status: "awaiting_results" as const,
  checkInTime: "08:15",
  daysUntil: 3,
  hoursUntil: 14,
  minutesUntil: 22,
  skills: [
    { name: "Listening", time: "08:45", status: "completed" as const },
    { name: "Reading", time: "09:45", status: "completed" as const },
    { name: "Writing", time: "11:05", status: "completed" as const },
    { name: "Speaking", time: "14:00", status: "scheduled" as const },
  ],
};

export const resultsAlert = {
  title: "Speaking results available — Band 7.0!",
  message:
    "Your June 5 mock exam full results are ready. You achieved your target band.",
  href: "/student/results",
};

export const bandProgress = [
  { month: "Jan", band: 5.5 },
  { month: "Feb", band: 5.5 },
  { month: "Mar", band: 5.5 },
  { month: "Apr", band: 6.0 },
  { month: "May", band: 6.5 },
  { month: "Jun", band: 7.0 },
];

export const pastMocks = [
  {
    id: "1",
    date: "May 15, 2025",
    type: "Full Academic Mock",
    listening: 7.0,
    reading: 6.5,
    writing: 6.0,
    speaking: 6.5,
    overall: 6.5,
    trend: 0.5,
  },
  {
    id: "2",
    date: "Apr 20, 2025",
    type: "Full Academic Mock",
    listening: 6.5,
    reading: 6.0,
    writing: 5.5,
    speaking: 6.0,
    overall: 6.0,
    trend: 0.5,
  },
  {
    id: "3",
    date: "Mar 8, 2025",
    type: "Full Academic Mock",
    listening: 6.0,
    reading: 5.5,
    writing: 5.0,
    speaking: 5.5,
    overall: 5.5,
    trend: null,
  },
];

export const activities = [
  {
    id: "1",
    type: "speaking" as const,
    title: "Speaking slot confirmed",
    detail: "June 12 @ 14:00 with Dr. Williams",
    time: "1h ago",
  },
  {
    id: "2",
    type: "writing" as const,
    title: "Writing assigned",
    detail: "Grader: Dr. Sarah Chen",
    time: "2h ago",
  },
  {
    id: "3",
    type: "reminder" as const,
    title: "Check-in reminder",
    detail: "Opens June 12 at 08:15",
    time: "1d ago",
  },
];
