import { apiFetch } from "./client";
import type {
  AdminContentTestOption,
  AdminPackage,
  ExamTypeValue,
  ReportTimeframe,
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

export function getNextMockNumber(
  skills: string[],
  examType: "ACADEMIC" | "GENERAL_TRAINING" = "ACADEMIC",
) {
  const q = encodeURIComponent(JSON.stringify(skills));
  const type = encodeURIComponent(examType);
  return apiFetch<{
    packageKind: string;
    packageKindLabel: string;
    mockNumber: number;
    mockLabel: string;
    suggestedTitle: string;
    description: string;
    included: string[];
    rules: string[];
    suggestedPrice: number;
  }>(`/admin/packages/next-mock-number?skills=${q}&examType=${type}`);
}

export function createPackage(payload: AdminPackagePayload) {
  return apiFetch("/admin/packages", { method: "POST", body: payload });
}

export function updatePackage(id: string, payload: AdminPackagePayload) {
  return apiFetch(`/admin/packages/${id}`, { method: "PATCH", body: payload });
}

export function deletePackage(id: string) {
  return apiFetch<{ archived?: boolean; deleted?: boolean; releasedContent?: boolean }>(
    `/admin/packages/${id}`,
    { method: "DELETE" },
  );
}

export function clonePackage(id: string) {
  return apiFetch<{ package: AdminPackage }>(
    "/admin/packages/" + id + "/clone",
    { method: "POST" },
  );
}

export function replacePackage(id: string) {
  return apiFetch<{ archivedId: string; replacement: AdminPackage }>(
    `/admin/packages/${id}/replace`,
    { method: "POST" },
  );
}

export function resetPackagePilot(id: string) {
  return apiFetch<{
    clearedEnrollments: number;
    clearedOrders: number;
    clearedSessions: number;
  }>(`/admin/packages/${id}/reset-pilot`, { method: "POST" });
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
    monthlyRevenue: { month: string; amount: number; orderCount?: number }[];
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
      missed?: number;
      cancelled?: number;
    };
    enrollments: {
      id: string;
      enrollmentId: string;
      studentName: string;
      targetBand: number | null;
      country: string;
      examDate: string;
      examTime: string | null;
      includedModules?: string[];
      completedModules: string[];
      speakingExaminer: string;
      writingExaminer: string;
      adminGranted?: boolean;
      welcomePromoGranted?: boolean;
      referralRewardGranted?: boolean;
      institutionGranted?: boolean;
      complimentaryAccess?: boolean;
      lifecycle: string;
    }[];
  }>("/admin/enrollments");
}

export type AdminEnrollmentDetail = {
  id: string;
  enrollmentId: string;
  studentName: string;
  packageTitle: string;
  examDate: string;
  examTime: string;
  lifecycle: string;
  resultsStatus: string;
  overallBand: number | null;
  skills: {
    skill: string;
    submitted: boolean;
    rawScore: number | null;
    band: number | null;
    contentTest: { id: string; code: string; title: string } | null;
  }[];
};

export function getEnrollmentDetail(enrollmentId: string) {
  return apiFetch<AdminEnrollmentDetail>(
    `/admin/enrollments/${encodeURIComponent(enrollmentId)}/detail`,
  );
}

export function rescoreEnrollment(enrollmentId: string) {
  return apiFetch<{
    rescored: {
      skill: string;
      rawScore: number;
      band: number | null;
      previous: { rawScore: number | null; band: number | null };
    }[];
  }>(`/admin/enrollments/${encodeURIComponent(enrollmentId)}/rescore`, {
    method: "POST",
  });
}

export function rescoreAllListeningReading() {
  return apiFetch<{ total: number; updated: number }>(
    "/admin/enrollments/rescore-all",
    { method: "POST" },
  );
}

export function overrideSectionScore(
  enrollmentId: string,
  skill: "listening" | "reading" | "writing" | "speaking",
  body: { band?: number; rawScore?: number; reason?: string },
) {
  return apiFetch<{ updated: boolean; skill: string; band: number }>(
    `/admin/enrollments/${encodeURIComponent(enrollmentId)}/scores/${skill}`,
    { method: "PATCH", body },
  );
}

async function downloadAdminPdfExport(
  path: string,
  body: object,
  fallbackFilename: string,
) {
  const { getAccessToken } = await import("@/lib/auth/session");
  const { API_BASE_URL } = await import("./config");
  const { ApiError } = await import("./errors");
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Cannot reach API at ${API_BASE_URL}`, 0);
  }
  if (!response.ok) {
    throw new ApiError(`Export failed (${response.status})`, response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportEnrollmentPdfs(enrollmentIds: string[]) {
  const count = enrollmentIds.length;
  await downloadAdminPdfExport(
    "/admin/enrollments/export-pdfs",
    { enrollmentIds },
    `itestu-reports-${count}-students.pdf`,
  );
}

export async function exportWritingPdfs(
  enrollmentIds: string[],
  tasks: ("task1" | "task2")[] = ["task1", "task2"],
) {
  const taskLabel = tasks.length === 2 ? "task1-task2" : tasks[0];
  await downloadAdminPdfExport(
    "/admin/enrollments/export-writing-pdfs",
    { enrollmentIds, tasks, waitForAi: true },
    `itestu-writing-${taskLabel}-${enrollmentIds.length}-students.pdf`,
  );
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
      activeAdminGrant: {
        enrollmentId: string;
        enrollmentCode: string;
        packageId: string;
        packageTitle: string;
        mockDate: string;
        mockDayCutoffAt: string | null;
        writingTeacherId: string | null;
        writingTeacherName: string | null;
        speakingTeacherId: string | null;
        speakingTeacherName: string | null;
        needsWriting: boolean;
        needsSpeaking: boolean;
      } | null;
    }[]
  >("/admin/students");
}

export type GrantEnrollmentBody = {
  studentId: string;
  packageId: string;
  mockDate: string;
  mockTime?: string;
  mockDayCutoffTime?: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
  speakingSlotId?: string;
};

export function reappointEnrollment(body: {
  enrollmentId: string;
  mockDate: string;
  mockTime?: string;
  mockDayCutoffTime?: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
}) {
  return apiFetch<{
    enrollmentId: string;
    enrollmentCode: string;
    reappointmentOfId: string;
    priorEnrollmentCode: string;
  }>("/admin/enrollments/reappoint", { method: "POST", body });
}

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

export type UpdateGrantEnrollmentBody = {
  packageId: string;
  mockDate: string;
  mockDayCutoffTime?: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
};

export function updateAdminGrant(
  enrollmentId: string,
  body: UpdateGrantEnrollmentBody,
) {
  return apiFetch<{ updated: boolean; enrollmentId: string; enrollmentCode: string }>(
    `/admin/enrollments/${enrollmentId}/grant`,
    { method: "PATCH", body },
  );
}

export function revokeAdminGrant(enrollmentId: string) {
  return apiFetch<{ revoked: boolean; enrollmentCode: string }>(
    `/admin/enrollments/${enrollmentId}/revoke-grant`,
    { method: "POST" },
  );
}

export type GrantablePackage = {
  id: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
  skills: unknown[];
  mockLabel: string;
};

export function getGrantablePackagesForStudent(
  studentId: string,
  exceptEnrollmentId?: string,
) {
  const query = exceptEnrollmentId
    ? `?exceptEnrollmentId=${encodeURIComponent(exceptEnrollmentId)}`
    : "";
  return apiFetch<{ packages: GrantablePackage[] }>(
    `/admin/students/${studentId}/grantable-packages${query}`,
  );
}

export function getAdminTeachers() {
  return apiFetch<
    {
      id: string;
      name: string;
      email: string;
      status: string;
      applicationRejected?: boolean;
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
      certificateUrls?: string[];
      submittedAt?: string;
      rejectedAt?: string;
    } | null;
    requestedWritingRate?: number | null;
    requestedSpeakingRate?: number | null;
    approvedWritingRate?: number | null;
    approvedSpeakingRate?: number | null;
    platformSharePercent?: number | null;
  }>(`/admin/teachers/${id}`);
}

export function updateTeacherRates(
  id: string,
  body: {
    approvedWritingRate?: number;
    approvedSpeakingRate?: number;
    platformSharePercent?: number;
    status?: "approved" | "pending" | "suspended";
  },
) {
  return apiFetch(`/admin/teachers/${id}/rates`, {
    method: "PATCH",
    body,
  });
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
  return apiFetch<{
    orders: {
      id: string;
      orderId: string;
      studentName: string;
      enrollmentRef?: string;
      package: string;
      paymentMethod: string;
      amount: number;
      status: string;
      createdAt: string;
    }[];
    summary: {
      revenueCollected: number;
      revenueTrend: string;
      paidOrders: number;
      paidTotal: number;
      refundsIssued: number;
      refundTotal: number;
      failedPayments: number;
      pendingPayments: number;
    };
    monthlyRevenue: { month: string; amount: number; orderCount: number }[];
  }>("/admin/orders");
}

/** Removes prisma-seed demo teacher payouts ($325/$210/$890 for @example.com teachers). */
export function purgeSeedDemoPayouts() {
  return apiFetch<{ deleted: number; teachersUpdated: number }>(
    "/admin/payouts/purge-seed-demo",
    { method: "POST" },
  );
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
  /** Full card holder name for offline transfer */
  cardHolderName?: string | null;
  /** Full card number (digits) for offline transfer */
  cardNumber?: string | null;
  bankLabel?: string | null;
  accountName?: string | null;
  payoutMethod?: string | null;
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

export type AdminDisputeRecord = {
  id: string;
  ticketId: string;
  type: string;
  priority: string;
  status: string;
  subject: string;
  description?: string;
  message?: string;
  preview?: string;
  sla: { state: string; progress: number };
  reporter?: { id: string; name: string; role: string } | null;
  relatedStudent?: string | null;
  relatedRef?: string | null;
  enrollmentId?: string | null;
  enrollmentRef?: string | null;
  enrollmentAdminGranted?: boolean;
  sessionCode?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  orderStatus?: string | null;
  orderAmount?: number | null;
  createdAt: string;
};

export function getAdminDisputes() {
  return apiFetch<AdminDisputeRecord[]>("/admin/disputes");
}

export function getAdminDispute(id: string) {
  return apiFetch<AdminDisputeRecord>(`/admin/disputes/${encodeURIComponent(id)}`);
}

export function reopenEnrollmentRegrade(
  enrollmentId: string,
  body: { skill: "writing" | "speaking"; reason?: string },
) {
  return apiFetch<{ reopened: boolean }>(
    `/admin/enrollments/${encodeURIComponent(enrollmentId)}/regrade`,
    { method: "POST", body },
  );
}

export function reassignWritingTeacher(
  enrollmentId: string,
  body: { teacherId: string },
) {
  return apiFetch<{ reassigned: boolean }>(
    `/admin/enrollments/${encodeURIComponent(enrollmentId)}/reassign-writing-teacher`,
    { method: "POST", body },
  );
}

export function getAdminReports(timeframe: ReportTimeframe = "jun") {
  return apiFetch<{
    timeframe: ReportTimeframe;
    period: {
      label: string;
      revenueLabel: string;
      examsPeriod: string;
    };
    summary: {
      revenueTotal: number;
      revenueTrend: string;
      revenueTrendSub: string;
      examsDelivered: number;
      examsTrend: string;
      avgBandScore: number | null;
      avgBandTrend: string;
      satisfaction: number | null;
      satisfactionSub: string;
      satisfactionTrend: string;
    };
    monthlyRevenue: { month: string; revenue: number; exams: number }[];
    enrollmentFunnel: { month: string; enrolled: number; completed: number }[];
    bandDistribution: { score: string; count: number; highlight: boolean }[];
    modulePerformance: {
      module: string;
      label: string;
      exams: number;
      avgBand: number;
      passRate: number;
      mom: number;
    }[];
    teacherLeaderboard: {
      id: string;
      name: string;
      status: string;
      speciality: string;
      sessions: number;
      rating: number | null;
      earned: number;
      mom: number;
    }[];
  }>(`/admin/reports/summary?timeframe=${timeframe}`);
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
      suspended?: boolean;
      suspendReason?: string | null;
      suspendedAt?: string | null;
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
  suspended?: boolean;
  suspendReason?: string | null;
  suspendedAt?: string | null;
};

export function getAdminSessionDetail(sessionCode: string) {
  return apiFetch<AdminSessionDetail>(`/admin/sessions/${sessionCode}`);
}

export function forceSubmitSession(sessionCode: string) {
  return apiFetch(`/admin/sessions/${sessionCode}/force-submit`, {
    method: "POST",
  });
}

export function resumeSession(sessionCode: string) {
  return apiFetch(`/admin/sessions/${sessionCode}/resume`, {
    method: "POST",
  });
}

export function suspendSessionAdmin(
  sessionCode: string,
  reason = "admin_hold",
) {
  return apiFetch(`/admin/sessions/${sessionCode}/suspend`, {
    method: "POST",
    body: { reason },
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
      activePackageLinks?: number;
      assignedMockLabel?: string | null;
      assignedMockLabels?: string[];
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

export function getNextContentTestIdentity(
  module: "listening" | "reading" | "writing" | "speaking",
) {
  return apiFetch<{ code: string; title: string; serial: number }>(
    `/admin/content/tests/next-identity?type=${encodeURIComponent(module.toUpperCase())}`,
  );
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

export function cloneContentTest(id: string) {
  return apiFetch<{ id: string; code: string; title: string }>(
    `/admin/content/tests/${id}/clone`,
    { method: "POST" },
  );
}

export function archiveContentTest(id: string) {
  return apiFetch<{ id: string; code: string; status: string }>(
    `/admin/content/tests/${id}/archive`,
    { method: "POST" },
  );
}

export function retireAndDuplicateContentTest(id: string) {
  return apiFetch<{
    clone: { id: string; code: string; title: string };
    archived: boolean;
    activePackageLinks: number;
  }>(`/admin/content/tests/${id}/retire-and-duplicate`, {
    method: "POST",
  });
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

// ─── Practice content & packages ─────────────────────────────────────────────

export type AdminPracticeUnit = {
  id: string;
  code: string;
  title: string;
  type: string;
  skill: string;
  questionType: string | null;
  status: string;
  durationMin: number;
  questionCount: number;
  passagePart: number | null;
  updatedAt: string;
  publishedAt: string | null;
  mediaCount: number;
};

export type AdminWritingPrompt = {
  id: string;
  code: string;
  title: string;
  taskNumber: number;
  minWords: number;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminPracticePackage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  bundle: Record<string, number>;
  displayPrices: Record<string, number>;
  isActive: boolean;
  mostPopular: boolean;
  contentSummary?: string;
  contentLocked?: boolean;
};

export type PracticeContentOptionUnit = {
  id: string;
  code: string;
  title: string;
  type: string;
  skill: string;
  questionType: string | null;
  questionCount: number;
  status: string;
  isAssigned: boolean;
  assignedPackageId: string | null;
  assignedPackageTitle: string | null;
};

export type PracticeContentOptionPrompt = {
  id: string;
  code: string;
  title: string;
  taskNumber: number;
  status: string;
  isAssigned: boolean;
  assignedPackageId: string | null;
  assignedPackageTitle: string | null;
};

export type PracticePackageContentOptions = {
  units: PracticeContentOptionUnit[];
  prompts: PracticeContentOptionPrompt[];
};

export type PracticePackageContent = {
  unitIds: string[];
  promptIds: string[];
};

export function getAdminPracticeUnits(params?: { type?: string; skill?: string }) {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.skill) q.set("skill", params.skill);
  const qs = q.toString();
  return apiFetch<AdminPracticeUnit[]>(
    `/admin/practice/units${qs ? `?${qs}` : ""}`,
  );
}

export function getAdminPracticeUnit(id: string) {
  return apiFetch(`/admin/practice/units/${id}`);
}

export function suggestPracticeUnitIdentity(
  type: string,
  options?: {
    passagePart?: number;
    listeningPart?: number;
    questionType?: string;
  },
) {
  const q = new URLSearchParams({ type });
  if (options?.passagePart) q.set("passagePart", String(options.passagePart));
  if (options?.listeningPart) q.set("listeningPart", String(options.listeningPart));
  if (options?.questionType) q.set("questionType", options.questionType);
  return apiFetch<{ code: string; title: string; type: string; skill: string }>(
    `/admin/practice/units/next-identity?${q.toString()}`,
  );
}

export function createPracticeUnit(payload: {
  code: string;
  title: string;
  type: string;
  questionType?: string;
  content: object;
  answerKey?: object;
  durationMin?: number;
}) {
  return apiFetch<AdminPracticeUnit>("/admin/practice/units", {
    method: "POST",
    body: payload,
  });
}

export function updatePracticeUnit(
  id: string,
  payload: {
    title?: string;
    questionType?: string;
    content?: object;
    answerKey?: object;
    durationMin?: number;
  },
) {
  return apiFetch(`/admin/practice/units/${id}`, { method: "PATCH", body: payload });
}

export function publishPracticeUnit(id: string) {
  return apiFetch(`/admin/practice/units/${id}/publish`, { method: "POST" });
}

export function getPracticeUnitAiPackStatus(id: string) {
  return apiFetch<{
    unitId: string;
    status: string;
    version: number;
    sectionStatus: Record<string, string>;
    generatedAt: string | null;
    errorMessage: string | null;
    hasInsights?: boolean;
    hasGlossary?: boolean;
  }>(`/admin/practice/units/${id}/ai-pack/status`);
}

export function regeneratePracticeUnitAiPack(id: string) {
  return apiFetch(`/admin/practice/units/${id}/ai-pack/regenerate`, {
    method: "POST",
  });
}

export function archivePracticeUnit(id: string) {
  return apiFetch(`/admin/practice/units/${id}/archive`, { method: "POST" });
}

export function deletePracticeUnit(id: string) {
  return apiFetch(`/admin/practice/units/${id}`, { method: "DELETE" });
}

export function uploadPracticeUnitMedia(id: string, key: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ key: string; url: string }>(
    `/admin/practice/units/${id}/media?key=${encodeURIComponent(key)}`,
    { method: "POST", body: form },
  );
}

export function getAdminWritingPrompts() {
  return apiFetch<AdminWritingPrompt[]>("/admin/practice/writing-prompts");
}

export function getAdminWritingPrompt(id: string) {
  return apiFetch(`/admin/practice/writing-prompts/${id}`);
}

export function suggestWritingPromptIdentity(taskNumber: number) {
  return apiFetch<{ code: string; title: string; taskNumber: number }>(
    `/admin/practice/writing-prompts/next-identity?taskNumber=${taskNumber}`,
  );
}

export function createWritingPrompt(payload: {
  code: string;
  title: string;
  taskNumber: number;
  instruction: string;
  minWords?: number;
  imageUrl?: string;
}) {
  return apiFetch<AdminWritingPrompt>("/admin/practice/writing-prompts", {
    method: "POST",
    body: payload,
  });
}

export function updateWritingPrompt(
  id: string,
  payload: { title?: string; instruction?: string; minWords?: number; imageUrl?: string },
) {
  return apiFetch(`/admin/practice/writing-prompts/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function publishWritingPrompt(id: string) {
  return apiFetch(`/admin/practice/writing-prompts/${id}/publish`, { method: "POST" });
}

export function getAdminPracticePackages() {
  return apiFetch<AdminPracticePackage[]>("/admin/practice/packages");
}

export function getPracticePackageContentOptions(excludePackageId?: string) {
  const q = excludePackageId
    ? `?excludePackageId=${encodeURIComponent(excludePackageId)}`
    : "";
  return apiFetch<PracticePackageContentOptions>(
    `/admin/practice/packages/content-options${q}`,
  );
}

export function getPracticePackageContent(packageId: string) {
  return apiFetch<PracticePackageContent>(
    `/admin/practice/packages/${packageId}/content`,
  );
}

export function suggestPracticePackagePrice(bundle: Record<string, number>) {
  return apiFetch<{ suggestedPrice: number; bundle: Record<string, number> }>(
    "/admin/practice/packages/suggest-price",
    { method: "POST", body: { bundle } },
  );
}

export function createPracticePackage(payload: {
  slug: string;
  title: string;
  description?: string;
  price: number;
  unitIds: string[];
  promptIds: string[];
  displayPrices?: Record<string, number>;
  isActive?: boolean;
  mostPopular?: boolean;
}) {
  return apiFetch("/admin/practice/packages", { method: "POST", body: payload });
}

export function updatePracticePackage(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    price: number;
    unitIds: string[];
    promptIds: string[];
    displayPrices: Record<string, number>;
    isActive: boolean;
    mostPopular: boolean;
  }>,
) {
  return apiFetch(`/admin/practice/packages/${id}`, { method: "PATCH", body: payload });
}

export function grantPracticeCredits(
  studentId: string,
  credits: Record<string, number> & { note?: string },
) {
  return apiFetch(`/admin/practice/students/${studentId}/credits`, {
    method: "POST",
    body: credits,
  });
}
