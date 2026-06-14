export type GradingStatus = "pending" | "in_review" | "graded";

export type WritingSubmission = {
  id: string;
  studentName: string;
  initials: string;
  date: string;
  slaHours: number;
  urgent: boolean;
  status: GradingStatus;
};

export const writingGradingQueue: WritingSubmission[] = [
  {
    id: "1",
    studentName: "Emma Williams",
    initials: "EW",
    date: "Jun 12",
    slaHours: 4,
    urgent: true,
    status: "pending",
  },
  {
    id: "2",
    studentName: "David Kim",
    initials: "DK",
    date: "Jun 12",
    slaHours: 6,
    urgent: true,
    status: "pending",
  },
  {
    id: "3",
    studentName: "Layla Hassan",
    initials: "LH",
    date: "Jun 11",
    slaHours: 8,
    urgent: false,
    status: "in_review",
  },
  {
    id: "4",
    studentName: "James Park",
    initials: "JP",
    date: "Jun 11",
    slaHours: 10,
    urgent: false,
    status: "graded",
  },
];

export const gradingSummary = {
  pendingGrading: 2,
  inReview: 1,
};
