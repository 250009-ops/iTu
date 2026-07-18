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
  missedMock: {
    enrollmentCode: string;
    packageTitle: string;
    mockDate: string;
    adminGranted: boolean;
    reason?: "speaking_no_show" | "never_started";
  } | null;
  bandProgress: {
    month: string;
    band: number | null;
    listening?: number | null;
    reading?: number | null;
    writing?: number | null;
    speaking?: number | null;
  }[];
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
  welcomePromos: {
    skill: "listening" | "reading";
    title: string;
    description: string;
    packageId: string;
    eligible: boolean;
    claimed: boolean;
    expiresAt: string;
  }[];
};

export type StudentProfileResponse = {
  name: string;
  email: string;
  phone: string | null;
  targetBand: number | null;
  examType: string;
  country: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  firstLanguage: string | null;
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
    mocksRemaining: number;
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
  dateOfBirth?: string;
  sex?: "M" | "F" | "X";
  firstLanguage?: string;
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

export function claimWelcomePromo(body: {
  skill: "listening" | "reading";
  mockDate: string;
}) {
  return apiFetch<{
    enrollmentCode: string;
    sessionCode: string;
    status: string;
  }>("/students/welcome-promo/claim", {
    method: "POST",
    body: JSON.stringify(body),
  });
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
      status?: string;
      packageTitle?: string;
      packageSkills?: string[];
      checkInCompleted?: boolean;
    } | null;
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

export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  country: string;
  overallBand: number;
  skillBands: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
  improvementDelta: number;
};

export type StudentLeaderboardResponse = {
  top: LeaderboardEntry[];
  currentStudent: LeaderboardEntry | null;
  showCurrentSeparately: boolean;
  optedIn: boolean;
  totalRanked: number;
};

export function getStudentLeaderboard() {
  return apiFetch<StudentLeaderboardResponse>("/students/leaderboard");
}

export type ApiPublicTeacher = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  speciality: string;
  rating: number;
  reviewCount: number;
  totalSessions: number;
  isTopRated: boolean;
  bio: string;
  longBio: string;
  credentials: string[];
  languages: string[];
  avatarUrl: string | null;
  memberSince: number;
  reviews?: { id: string; name: string; rating: number; quote: string }[];
};

export function getStudentTeachers(params?: {
  limit?: number;
  activeOnly?: boolean;
  speciality?: "writing" | "speaking" | "both";
}) {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.activeOnly) search.set("activeOnly", "true");
  if (params?.speciality) search.set("speciality", params.speciality);
  const q = search.toString();
  return apiFetch<ApiPublicTeacher[]>(
    `/students/teachers${q ? `?${q}` : ""}`,
  );
}

export function getStudentTeacher(slug: string) {
  return apiFetch<ApiPublicTeacher>(
    `/students/teachers/${encodeURIComponent(slug)}`,
  );
}

export function createSupportTicket(body: {
  subject: string;
  message: string;
  type?:
    | "regrade_request"
    | "teacher_no_show"
    | "technical_issue"
    | "payment_dispute"
    | "student_conduct";
  enrollmentId?: string;
  relatedRef?: string;
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

export type StudentCatalogOffer = {
  tabId: string;
  label: string;
  packageKind: string;
  examType: string;
  displayTitle: string;
  package: StudentCatalogPackage | null;
  activeEnrollment?: {
    enrollmentCode: string;
    mockDate: string;
    mockTime: string | null;
    packageTitle: string;
  } | null;
};

/** One offer per mock type with the next unpurchased package auto-resolved. */
export function listStudentCatalogOffers() {
  return apiFetch<StudentCatalogOffer[]>("/students/catalog/offers");
}
