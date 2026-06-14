export type TeacherStatus = "approved" | "pending" | "suspended";
export type TeacherSpeciality = "writing" | "speaking" | "both";

export type Examiner = {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: TeacherStatus;
  rating: number | null;
  sessions: number;
  totalEarned: number;
  joined: string;
  speciality: TeacherSpeciality;
};

export const teachersSummary = {
  total: 5,
  approved: 3,
  pendingReview: 1,
  suspended: 1,
};

export const examiners: Examiner[] = [
  {
    id: "1",
    name: "Dr. Sarah Chen",
    initials: "SC",
    email: "sarah.chen@ielts-mock.com",
    status: "approved",
    rating: 4.9,
    sessions: 1247,
    totalEarned: 14890,
    joined: "Jan 2018",
    speciality: "writing",
  },
  {
    id: "2",
    name: "Emma Williams",
    initials: "EW",
    email: "emma.w@ielts-mock.com",
    status: "approved",
    rating: 4.9,
    sessions: 2103,
    totalEarned: 21500,
    joined: "Mar 2017",
    speciality: "speaking",
  },
  {
    id: "3",
    name: "James Morrison",
    initials: "JM",
    email: "j.morrison@ielts-mock.com",
    status: "pending",
    rating: null,
    sessions: 0,
    totalEarned: 0,
    joined: "Jun 2026",
    speciality: "both",
  },
  {
    id: "4",
    name: "Aisha Patel",
    initials: "AP",
    email: "aisha.p@ielts-mock.com",
    status: "approved",
    rating: 4.8,
    sessions: 631,
    totalEarned: 7200,
    joined: "Sep 2021",
    speciality: "writing",
  },
  {
    id: "5",
    name: "Michael Torres",
    initials: "MT",
    email: "m.torres@ielts-mock.com",
    status: "suspended",
    rating: 4.2,
    sessions: 445,
    totalEarned: 5100,
    joined: "Feb 2020",
    speciality: "speaking",
  },
];

export const statusFilterOptions: { value: "all" | TeacherStatus; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];
