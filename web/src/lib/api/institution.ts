import { apiFetch } from "./client";
import { getInstitutionEnrollmentPackages as fetchEnrollmentPackages } from "./institution-content";
import type {
  CohortReport,
  CreditsData,
  EnrollmentsData,
  ExaminersData,
  InstitutionProfile,
  OverviewData,
  StudentsData,
} from "@/lib/institution/types";

export function getInstitutionOverview() {
  return apiFetch<OverviewData>("/institution/overview");
}

export function getInstitutionMocks() {
  return apiFetch<{
    tabs: {
      tabId: string;
      label: string;
      packageKind: string;
      examType: string;
    }[];
    packages: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      price: number;
      currency: string;
      examType: string;
      packageKind: string;
      mockNumber: number;
      mostPopular: boolean;
      rating: number | null;
      reviewCount: number;
      skills: unknown;
      included: unknown;
      rules: unknown;
      grantSetId: string;
      grantSetTitle: string;
      grantSource: "ADMIN_GRANT" | "PURCHASE" | "OWN";
    }[];
    grants: {
      setId: string;
      setTitle: string;
      grantedAt: string;
      source: "ADMIN_GRANT" | "PURCHASE";
    }[];
    preview: {
      tabs: {
        tabId: string;
        label: string;
        packageKind: string;
        examType: string;
      }[];
      packages: {
        id: string;
        slug: string;
        title: string;
        description: string | null;
        price: number;
        currency: string;
        examType: string;
        packageKind: string;
        mockNumber: number;
        mostPopular: boolean;
        rating: number | null;
        reviewCount: number;
        skills: unknown;
        included: unknown;
        rules: unknown;
        grantSetId: string;
        grantSetTitle: string;
        grantSource: "ADMIN_GRANT" | "PURCHASE" | "OWN";
      }[];
      showcaseSetTitle: string;
    } | null;
  }>("/institution/mocks");
}

export type InstitutionMockPackage = Awaited<
  ReturnType<typeof getInstitutionMocks>
>["packages"][number];

export type InstitutionMockPreview = NonNullable<
  Awaited<ReturnType<typeof getInstitutionMocks>>["preview"]
>;

export type InstitutionMockShopOffer = {
  setId: string | null;
  slug: string;
  title: string;
  description: string | null;
  listPrice: number;
  currency: string;
  contentSummary: string;
  canPurchase: boolean;
  disabledReason?: string;
  product: {
    id: string;
    slug: string;
    title: string;
    description: string;
    examType: string;
    delivery: string;
    bookCta: string;
    price: number;
    currency: string;
    mostPopular: boolean;
    rating: number | null;
    reviewCount: number;
    skills: {
      id: string;
      name: string;
      detail: string;
      badge: string;
      color: "sky" | "emerald" | "violet" | "rose";
    }[];
    included: string[];
    rules: string[];
    highlights: { icon: "clock" | "user" | "check" | "globe" | "chart"; label: string }[];
  };
};

export function getInstitutionMockShop() {
  return apiFetch<{ sets: InstitutionMockShopOffer[] }>("/institution/mocks/shop");
}

export function createMockSetCheckout(setId: string) {
  return apiFetch<{
    orderCode: string;
    checkoutUrl: string;
    setId: string;
    setTitle: string;
    amount: number;
  }>(`/institution/mocks/shop/${setId}/checkout`, { method: "POST" });
}

export function getMockSetOrderStatus(orderCode: string) {
  return apiFetch<{
    orderCode: string;
    status: string;
    setId: string | null;
    checkoutUrl: string | null;
  }>(`/institution/mocks/orders/${orderCode}/status`);
}

export function getInstitutionCredits() {
  return apiFetch<CreditsData>("/institution/credits");
}

export function createCreditCheckout(packId: string) {
  return apiFetch<{
    orderCode: string;
    checkoutUrl: string;
    credits: number;
    amount: number;
  }>("/institution/credits/checkout", {
    method: "POST",
    body: { packId },
  });
}

export function getCreditOrderStatus(orderCode: string) {
  return apiFetch<{
    orderCode: string;
    status: string;
    credits: number | null;
    checkoutUrl: string | null;
  }>(`/institution/credits/orders/${orderCode}/status`);
}

export function getInstitutionStudents(status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return apiFetch<StudentsData>(`/institution/students${query}`);
}

export function approveStudent(id: string) {
  return apiFetch<{ status: string }>(`/institution/students/${id}/approve`, {
    method: "POST",
  });
}

export function rejectStudent(id: string) {
  return apiFetch<{ status: string }>(`/institution/students/${id}/reject`, {
    method: "POST",
  });
}

export function inviteStudent(body: { name: string; email: string }) {
  return apiFetch<{
    invited: boolean;
    studentId?: string;
    email: string;
    name: string;
  }>("/institution/students/invite", { method: "POST", body });
}

export function getInstitutionNavBadges() {
  return apiFetch<{ liveSessions: number; flaggedSessions: number }>(
    "/institution/nav-badges",
  );
}

export type InstitutionSessionDetail = {
  id: string;
  sessionCode: string;
  state: string;
  integrity: string;
  integrityLog: {
    event: string;
    metadata?: Record<string, unknown>;
    at: string;
    userId?: string;
  }[];
  studentName: string;
  country: string;
  skill: string | null;
  sectionStartedAt: string | null;
  enrollmentCode: string;
  suspended?: boolean;
  suspendReason?: string | null;
  suspendedAt?: string | null;
};

export function getInstitutionLiveSessions() {
  return apiFetch<
    {
      sessionCode: string;
      studentName: string;
      country: string;
      skill: string;
      progress: number;
      timeLeft: string;
      remainingSec?: number;
      examiner?: string;
      integrity: string;
      flags: number;
      suspended?: boolean;
      suspendReason?: string | null;
      suspendedAt?: string | null;
    }[]
  >("/institution/sessions/live");
}

export function getInstitutionSessionDetail(sessionCode: string) {
  return apiFetch<InstitutionSessionDetail>(
    `/institution/sessions/${sessionCode}`,
  );
}

export function forceSubmitInstitutionSession(sessionCode: string) {
  return apiFetch(`/institution/sessions/${sessionCode}/force-submit`, {
    method: "POST",
  });
}

export function resumeInstitutionSession(sessionCode: string) {
  return apiFetch(`/institution/sessions/${sessionCode}/resume`, {
    method: "POST",
  });
}

export function suspendInstitutionSession(
  sessionCode: string,
  reason = "centre_hold",
) {
  return apiFetch(`/institution/sessions/${sessionCode}/suspend`, {
    method: "POST",
    body: { reason },
  });
}

export function reviewInstitutionSessionIntegrity(
  sessionCode: string,
  decision: "clear" | "uphold",
  note?: string,
) {
  return apiFetch(`/institution/sessions/${sessionCode}/integrity/review`, {
    method: "POST",
    body: { decision, note },
  });
}

export function enrollStudents(body: {
  studentIds: string[];
  packageId: string;
  mockDate: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
  speakingSlotId?: string;
  speakingTime?: string;
}) {
  return apiFetch<{
    enrolled: number;
    failed: { studentId: string; error?: string }[];
  }>("/institution/enroll", { method: "POST", body });
}

export function getInstitutionExaminers() {
  return apiFetch<ExaminersData>("/institution/examiners");
}

export function inviteExaminer(body: {
  name: string;
  email: string;
  speciality: "WRITING" | "SPEAKING" | "BOTH";
}) {
  return apiFetch<{ invited: boolean; examinerId?: string }>(
    "/institution/examiners/invite",
    { method: "POST", body },
  );
}

export function updateExaminerSpeciality(
  examinerId: string,
  speciality: "WRITING" | "SPEAKING" | "BOTH",
) {
  return apiFetch<{ updated: boolean; speciality: string }>(
    `/institution/examiners/${examinerId}`,
    { method: "PATCH", body: { speciality } },
  );
}

export function removeExaminer(examinerId: string) {
  return apiFetch<{ removed: boolean }>(
    `/institution/examiners/${examinerId}`,
    { method: "DELETE" },
  );
}

export function getInstitutionEnrollments() {
  return apiFetch<EnrollmentsData>("/institution/enrollments");
}

export function getCohortReport(range?: string) {
  const query = range ? `?range=${range}` : "";
  return apiFetch<CohortReport>(`/institution/reports/cohort${query}`);
}

export function getInstitutionProfile() {
  return apiFetch<InstitutionProfile>("/institution/profile");
}

export function updateInstitutionProfile(body: Partial<InstitutionProfile>) {
  return apiFetch<InstitutionProfile>("/institution/profile", {
    method: "PATCH",
    body,
  });
}

export async function uploadInstitutionLogo(
  file: File,
): Promise<InstitutionProfile> {
  const form = new FormData();
  form.append("file", file);
  const { getAccessToken } = await import("@/lib/auth/session");
  const { API_BASE_URL } = await import("./config");
  const { ApiError } = await import("./errors");
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/institution/profile/logo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message =
      (data as { message?: string } | null)?.message ?? "Logo upload failed.";
    throw new ApiError(message, response.status, data);
  }
  return data as InstitutionProfile;
}

// ─── Catalog helpers reused for the enroll wizard ──────────────────────────

export interface EnrollmentPackageOption {
  id: string;
  title: string;
  packageKind: string;
  mockNumber: number;
  examType?: string;
  costsCredit?: boolean;
  skills?: string[];
  needsWriting?: boolean;
  needsSpeaking?: boolean;
}

export type EnrollmentMockStatus =
  | "available"
  | "in_progress"
  | "completed"
  | "blocked";

export interface EnrollmentMockOption extends EnrollmentPackageOption {
  packageKindLabel?: string;
  mockLabel?: string;
  enrollStatus: EnrollmentMockStatus;
  statusLabel: string;
  blockingReason?: string;
  enrollment?: {
    enrollmentCode: string;
    mockDate: string;
    status: string;
    resultsStatus: string;
  };
}

export interface EnrollmentPackagesGrouped {
  studentId: string;
  mocks: EnrollmentMockOption[];
  /** @deprecated Use `mocks` */
  platform: EnrollmentMockOption[];
  /** @deprecated Use `mocks` */
  own: EnrollmentMockOption[];
}

export function getInstitutionEnrollmentPackages(
  studentId: string,
  packageKind?: string,
) {
  return fetchEnrollmentPackages(studentId, packageKind);
}

/** @deprecated Use getInstitutionEnrollmentPackages(studentId) */
export function getInstitutionPackages() {
  return getInstitutionEnrollmentPackages("").catch(() => ({
    studentId: "",
    mocks: [],
    platform: [],
    own: [],
  }));
}
