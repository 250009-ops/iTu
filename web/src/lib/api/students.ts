import { apiFetch } from "./client";

export type StudentDashboardResponse = {
  user: {
    name: string;
    targetBand: number | null;
    examType: string;
    mocksCompleted: number;
  };
  stats: {
    mocksCompleted: number;
    currentBestBand: number | null;
    bandImprovement: number;
    targetBand: number | null;
    targetAchieved: boolean;
    upcomingMocks: number;
    unreadNotifications: number;
  };
  resultsAlert: {
    title: string;
    message: string;
    href: string;
  } | null;
  upcomingMock: {
    enrollmentCode: string;
    mockDate: string;
    mockTime: string;
    package: string;
    sessionCode?: string;
    status: string;
    writingExaminer?: string;
    speakingExaminer?: string;
    daysUntil: number;
    hoursUntil: number;
    minutesUntil: number;
    mockStarted?: boolean;
    hasPastResults?: boolean;
    skills: { name: string; status: string }[];
    packageSkills?: string[];
  } | null;
  bandProgress: { month: string; band: number | null }[];
  pastMocks: {
    id: string;
    enrollmentCode: string;
    mockDate: string;
    package: string;
    packageSkills?: string[];
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
    overall: number | null;
    status: string;
  }[];
  activities: {
    id: string;
    type: string;
    title: string;
    detail: string;
    time: string;
    isRead: boolean;
  }[];
};

export type StudentProfileResponse = {
  name: string;
  email: string;
  phone: string | null;
  targetBand: number | null;
  examType: string;
  country: string | null;
  memberSince?: string;
  publishToLeaderboard: boolean;
  notificationPrefs: Record<string, boolean> | null;
  package: {
    title: string | null;
    purchasedAt: string | null;
    amount: number | null;
    currency: string | null;
    orderCode: string | null;
    skills: string[];
    mocksUsed: number;
    mocksTotal: number;
  };
  scoreHistory: {
    date: string;
    package: string;
    bands: { skill: string; band: number | null }[];
  }[];
};

export type UpdateProfileBody = {
  name?: string;
  phone?: string;
  country?: string;
  targetBand?: number;
  examType?: "academic" | "general_training";
  notificationPrefs?: Record<string, boolean>;
};

export function updateStudentProfile(body: UpdateProfileBody) {
  return apiFetch<StudentProfileResponse>("/students/profile", {
    method: "PATCH",
    body,
  });
}

export type ReviewableMock = {
  enrollmentId: string;
  enrollmentCode: string;
  package: string;
  mockDate: string;
  writingExaminer: string | null;
  speakingExaminer: string | null;
  review: {
    rating: number;
    comment: string | null;
    publishConsent: boolean;
  } | null;
};

export function getStudentDashboard() {
  return apiFetch<StudentDashboardResponse>("/students/dashboard");
}

export function getStudentProfile() {
  return apiFetch<StudentProfileResponse>("/students/profile");
}

export function getMockDayHub() {
  return apiFetch<{
    enrollment: {
      id: string;
      enrollmentCode: string;
      mockDate: string;
      mockTime: string | null;
      mockDayCutoffAt?: string | null;
      adminGranted?: boolean;
      examStartedAt?: string | null;
      speakingTeacherId?: string | null;
      speakingSlotId?: string | null;
      sessionCode: string;
      state: string;
      packageTitle?: string;
      packageSkills?: string[];
      checkInCompleted?: boolean;
    } | null;
    missed?: {
      enrollmentId: string;
      enrollmentCode: string;
      packageTitle: string;
      mockDate: string;
      adminGranted: boolean;
    };
    sections: {
      skill: string;
      completed: boolean;
      active: boolean;
      unlocked?: boolean;
      band?: number | null;
      rawScore?: number | null;
    }[];
    speaking: { scheduledAt?: string; examiner?: string } | null;
    writing?: { examiner?: string | null } | null;
  }>("/students/mock-day");
}

export function getReviewables() {
  return apiFetch<ReviewableMock[]>("/students/reviewables");
}

export function submitReview(body: {
  enrollmentId: string;
  rating: number;
  comment?: string;
  publishConsent?: boolean;
}) {
  return apiFetch<{ id: string; submitted: boolean }>("/students/reviews", {
    method: "POST",
    body,
  });
}

export function setLeaderboardConsent(publish: boolean) {
  return apiFetch<{ publishToLeaderboard: boolean }>(
    "/students/leaderboard-consent",
    { method: "PATCH", body: { publish } },
  );
}

export function createSupportTicket(body: {
  subject: string;
  message: string;
  type?:
    | "regrade_request"
    | "teacher_no_show"
    | "technical_issue"
    | "payment_dispute";
  enrollmentId?: string;
}) {
  return apiFetch<{ id: string; ticketId: string; status: string }>(
    "/students/support-tickets",
    { method: "POST", body },
  );
}

export function exportPersonalData() {
  return apiFetch<Record<string, unknown>>("/students/me/data-export");
}

export type StudentCatalogPackage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  examType: string;
  mostPopular: boolean;
  rating: number | null;
  reviewCount: number;
  skills: string[];
  included: string[];
  rules: string[];
};

/** Active packages this student may book (excludes completed or enrolled mocks). */
export function listStudentCatalogPackages() {
  return apiFetch<StudentCatalogPackage[]>("/students/catalog/packages");
}
