import { apiFetch } from "./client";
import type {
  AdminContentTestOption,
  AdminPackage,
  ExamTypeValue,
} from "@/lib/admin/types";

export type AdminPackagePayload = {
  title?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  examType?: ExamTypeValue;
  skills?: string[];
  mostPopular?: boolean;
  rating?: number | null;
  reviewCount?: number;
  included?: string[];
  rules?: string[];
  listeningTestId?: string | null;
  readingTestId?: string | null;
  writingTestId?: string | null;
  speakingBankId?: string | null;
  isActive?: boolean;
};

export function getAdminPackages() {
  return apiFetch<{
    packages: AdminPackage[];
    contentTests: AdminContentTestOption[];
  }>("/admin/packages");
}

export function getNextMockNumber(skills: string[]) {
  const q = encodeURIComponent(JSON.stringify(skills));
  return apiFetch<{
    packageKind: string;
    packageKindLabel: string;
    mockNumber: number;
    mockLabel: string;
  }>(`/admin/packages/next-mock-number?skills=${q}`);
}

export function createPackage(payload: AdminPackagePayload) {
  return apiFetch("/admin/packages", { method: "POST", body: payload });
}

export function updatePackage(id: string, payload: AdminPackagePayload) {
  return apiFetch(`/admin/packages/${id}`, { method: "PATCH", body: payload });
}

export function deletePackage(id: string) {
  return apiFetch<{ archived?: boolean; deleted?: boolean }>(
    `/admin/packages/${id}`,
    { method: "DELETE" },
  );
}

export function clonePackage(id: string) {
  return apiFetch("/admin/packages/" + id + "/clone", { method: "POST" });
}

export function updateTicket(
  id: string,
  payload: {
    status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assigneeId?: string | null;
  },
) {
  return apiFetch(`/admin/disputes/${id}`, { method: "PATCH", body: payload });
}

export function getAdminNavBadges() {
  return apiFetch<{ liveSessions: number; openTickets: number }>(
    "/admin/nav-badges",
  );
}

export function getAdminDashboard() {
  return apiFetch<{
    kpis: {
      totalEnrollments: number;
      activeExams: number;
      totalRevenue: number;
      openTickets: number;
    };
    liveSessions: {
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
    }[];
    monthlyRevenue: { month: string; amount: number }[];
    completionRates: {
      skill: string;
      pct: number;
      color: "sky" | "emerald" | "violet" | "rose";
    }[];
    meta: {
      syncedAt: string;
      status: string;
    };
    navBadges: {
      liveSessions: number;
      openTickets: number;
    };
  }>("/admin/dashboard");
}

export function getAdminEnrollments() {
  return apiFetch<{
    summary: {
      total: number;
      activeExams: number;
      awaitingResults: number;
      completed: number;
    };
    enrollments: {
      id: string;
      enrollmentId: string;
      studentName: string;
      targetBand: number | null;
      country: string;
      examDate: string;
      examTime: string;
      completedModules: string[];
      speakingExaminer: string;
      writingExaminer: string;
      lifecycle: string;
    }[];
  }>("/admin/enrollments");
}

export function getAdminStudents() {
  return apiFetch<
    {
      id: string;
      name: string;
      email: string;
      targetBand: number | null;
      examType: string;
      country: string | null;
      emailVerified: boolean;
      enrollments: number;
      createdAt: string;
    }[]
  >("/admin/students");
}

export type GrantEnrollmentBody = {
  studentId: string;
  packageId: string;
  mockDate: string;
  mockTime: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
  speakingSlotId?: string;
};

export function grantEnrollment(body: GrantEnrollmentBody) {
  return apiFetch<{
    enrollmentId: string;
    enrollmentCode: string;
    orderId: string;
    orderCode: string;
    sessionCode: string;
    amount: number;
    currency: string;
    status: string;
  }>("/admin/enrollments/grant", { method: "POST", body });
}

export function getAdminTeachers() {
  return apiFetch<
    {
      id: string;
      name: string;
      email: string;
      status: string;
      rating: number | null;
      sessions: number;
      totalEarned: number;
      speciality: string;
      createdAt: string;
    }[]
  >("/admin/teachers");
}

export function getAdminTeacher(id: string) {
  return apiFetch<{
    id: string;
    name: string;
    email: string;
    status: string;
    rating: number | null;
    sessions: number;
    totalEarned: number;
    speciality: string;
    createdAt: string;
    bio?: string | null;
    languages?: unknown;
    credentials?: unknown;
    application?: {
      ieltsWritingBand?: number;
      ieltsSpeakingBand?: number;
      yearsExperience?: number;
      qualifications?: string[];
      certificateUrls?: string[];
      phone?: string | null;
      submittedAt?: string;
    } | null;
  }>(`/admin/teachers/${id}`);
}

export function updateTeacherStatus(
  id: string,
  status: "approved" | "pending" | "suspended",
) {
  return apiFetch(`/admin/teachers/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function getAdminOrders() {
  return apiFetch<
    {
      id: string;
      orderId: string;
      studentName: string;
      enrollmentRef?: string;
      package: string;
      paymentMethod: string;
      amount: number;
      status: string;
      createdAt: string;
    }[]
  >("/admin/orders");
}

export function refundOrder(
  id: string,
  payload?: { amount?: number; reason?: string },
) {
  return apiFetch<{
    refundId: string;
    orderId: string;
    amount: number;
    status: string;
  }>(`/admin/orders/${id}/refund`, { method: "POST", body: payload ?? {} });
}

export type AdminPayout = {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  createdAt: string;
};

export function getAdminPayouts() {
  return apiFetch<AdminPayout[]>("/admin/payouts");
}

export function updatePayoutStatus(
  id: string,
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED",
) {
  return apiFetch(`/admin/payouts/${id}`, { method: "PATCH", body: { status } });
}

export type BandTableRow = {
  id: string;
  skill: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  rawScore: number;
  band: number;
};

export function getBandTable() {
  return apiFetch<BandTableRow[]>("/admin/band-table");
}

export function updateBandTable(
  rows: { skill: BandTableRow["skill"]; rawScore: number; band: number }[],
) {
  return apiFetch<BandTableRow[]>("/admin/band-table", {
    method: "PUT",
    body: { rows },
  });
}

export function getAdminDisputes() {
  return apiFetch<
    {
      id: string;
      ticketId: string;
      type: string;
      priority: string;
      status: string;
      subject: string;
      sla: { state: string; progress: number };
      assignee?: string;
      createdAt: string;
    }[]
  >("/admin/disputes");
}

export function getAdminReports() {
  return apiFetch<{
    funnel: { status: string; count: number }[];
    revenue: { total: number; orderCount: number };
    teacherLeaderboard: {
      name: string;
      sessions: number;
      rating: number | null;
      earned: number;
    }[];
  }>("/admin/reports/summary");
}

export function getLiveSessions() {
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
    }[]
  >("/admin/sessions/live");
}

export type AdminSessionDetail = {
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
};

export function getAdminSessionDetail(sessionCode: string) {
  return apiFetch<AdminSessionDetail>(`/admin/sessions/${sessionCode}`);
}

export function forceSubmitSession(sessionCode: string) {
  return apiFetch(`/admin/sessions/${sessionCode}/force-submit`, {
    method: "POST",
  });
}

export function reviewSessionIntegrity(
  sessionCode: string,
  decision: "clear" | "uphold",
  note?: string,
) {
  return apiFetch(`/admin/sessions/${sessionCode}/integrity/review`, {
    method: "POST",
    body: { decision, note },
  });
}

export function getContentTests(type?: string) {
  const q = type ? `?type=${type}` : "";
  return apiFetch<
    {
      id: string;
      code: string;
      title: string;
      type: string;
      status: string;
      version: number;
      durationMin: number;
      updatedAt: string;
      publishedAt: string | null;
      mediaCount?: number;
      questionCount?: number;
      authorName?: string;
      linkedPackages?: number;
      assignedMockLabel?: string | null;
    }[]
  >(`/admin/content/tests${q}`);
}

export function getContentTest(id: string) {
  return apiFetch<{
    id: string;
    code: string;
    title: string;
    type: string;
    status: string;
    durationMin: number;
    content: unknown;
    answerKey: unknown;
    mediaAssets: {
      id: string;
      key: string;
      url: string;
      mimeType: string;
      sizeBytes: number | null;
    }[];
  }>(`/admin/content/tests/${id}`);
}

export async function uploadListeningMedia(
  testId: string,
  partKey: string,
  file: File,
) {
  const form = new FormData();
  form.append("file", file);
  const { getAccessToken } = await import("@/lib/auth/session");
  const { API_BASE_URL } = await import("./config");
  const { ApiError } = await import("./errors");
  const token = getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/admin/content/tests/${testId}/media?key=${encodeURIComponent(partKey)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(`Invalid API response (${response.status})`, response.status);
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Upload failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as {
    id: string;
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number | null;
  };
}

export function createContentTest(payload: {
  code: string;
  title: string;
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  content: object;
  answerKey?: object;
  durationMin?: number;
}) {
  return apiFetch<{
    id: string;
    code: string;
    title: string;
    type: string;
    status: string;
  }>("/admin/content/tests", { method: "POST", body: payload });
}

export function updateContentTest(
  id: string,
  payload: {
    title?: string;
    content?: object;
    answerKey?: object;
    durationMin?: number;
  },
) {
  return apiFetch(`/admin/content/tests/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function uploadContentMedia(
  testId: string,
  partKey: string,
  file: File,
) {
  return uploadListeningMedia(testId, partKey, file);
}

export function submitContentTestForReview(id: string) {
  return apiFetch(`/admin/content/tests/${id}/submit-review`, { method: "POST" });
}

export function revertContentTestToDraft(id: string) {
  return apiFetch(`/admin/content/tests/${id}/revert-draft`, { method: "POST" });
}

export function importContentTest(payload: {
  code: string;
  title: string;
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  content: object;
  answerKey?: object;
  durationMin?: number;
}) {
  return apiFetch<{ id: string; code: string; title: string }>(
    "/admin/content/tests/import",
    { method: "POST", body: payload },
  );
}

export function importAnswerKeyCsv(testId: string, csv: string) {
  return apiFetch(`/admin/content/tests/${testId}/import-answer-key`, {
    method: "POST",
    body: { csv },
  });
}

export function publishContentTest(id: string) {
  return apiFetch(`/admin/content/tests/${id}/publish`, { method: "POST" });
}

export function cloneContentTest(
  id: string,
  payload: { code: string; title: string },
) {
  return apiFetch<{ id: string; code: string; title: string }>(
    `/admin/content/tests/${id}/clone`,
    { method: "POST", body: payload },
  );
}

export function deleteContentTest(id: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/admin/content/tests/${id}`,
    { method: "DELETE" },
  );
}

export function getAdminSettings() {
  return apiFetch<Record<string, unknown>>("/admin/settings");
}

export function updateAdminSettings(section: string, settings: object) {
  return apiFetch(`/admin/settings/${section}`, {
    method: "PATCH",
    body: settings,
  });
}
