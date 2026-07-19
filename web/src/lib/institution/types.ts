export type MemberStatus = "active" | "pending" | "rejected" | "removed";

export interface SectionProgress {
  listening: boolean;
  reading: boolean;
  writing: boolean;
  speaking: boolean;
}

export interface EnrollmentRow {
  id: string;
  enrollmentCode: string;
  studentName: string;
  packageTitle: string;
  mockDate: string;
  mockTime: string | null;
  status: string;
  examiner: string | null;
  progress: SectionProgress;
  overallBand: number | null;
  resultsStatus: string;
}

export interface OverviewData {
  centerName: string;
  grantedSetCount: number;
  wholesalePrice: number;
  currency: string;
  activeStudents: number;
  pendingStudents: number;
  upcomingMocksCount: number;
  avgCohortBand: number | null;
  upcomingMocks: EnrollmentRow[];
  recentResults: {
    id: string;
    studentName: string;
    overallBand: number | null;
    targetBand: number | null;
    date: string;
  }[];
}

export interface CreditPack {
  id: string;
  label: string;
  credits: number;
  discountPct: number;
  popular: boolean;
  total: number;
  pricePerCredit: number;
}

export interface CreditLedgerEntry {
  id: string;
  type: string;
  delta: number;
  balanceAfter: number;
  reference: string | null;
  note: string | null;
  date: string;
}

export interface CreditsData {
  balance: number;
  wholesalePrice: number;
  currency: string;
  totalPurchased: number;
  creditsUsedThisMonth: number;
  packs: CreditPack[];
  ledger: CreditLedgerEntry[];
}

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  status: MemberStatus;
  verified: boolean;
  joinedAt: string;
  targetBand: number | null;
  mocksTaken: number;
  latestBand: number | null;
}

export interface StudentsData {
  summary: {
    total: number;
    active: number;
    pending: number;
    avgBand: number | null;
    reachedBand7: number;
  };
  students: StudentRow[];
}

export interface ExaminerRow {
  id: string;
  name: string;
  email: string;
  speciality: string;
  status: "active" | "pending";
  rating: number | null;
  totalSessions: number;
}

export interface ExaminersData {
  summary: {
    total: number;
    active: number;
    pendingInvitations: number;
    avgRating: number | null;
    sessionsDelivered: number;
  };
  examiners: ExaminerRow[];
}

export interface EnrollmentsData {
  summary: {
    scheduled: number;
    inProgress: number;
    awaitingResults: number;
    completed: number;
  };
  enrollments: EnrollmentRow[];
}

export interface CohortReport {
  summary: {
    studentsTested: number;
    avgOverallBand: number | null;
    avgImprovement: number | null;
    mocksDelivered: number;
  };
  bandDistribution: { band: number; count: number }[];
  trend: { month: string; avgBand: number }[];
  skillAverages: {
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
  };
  topPerformers: {
    name: string;
    startBand: number;
    latestBand: number;
    improvement: number;
    mocks: number;
  }[];
}

export interface InstitutionProfile {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
  bio: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  wholesalePrice: number;
  currency: string;
  creditBalance: number;
  joinDeepLink: string | null;
  publicPageUrl: string;
}
