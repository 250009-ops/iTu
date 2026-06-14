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
  mostPopular?: boolean;
  rating?: number | null;
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
      examiner?: string;
      integrity: string;
    }[];
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
    }[]
  >("/admin/teachers");
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
      examiner?: string;
      integrity: string;
    }[]
  >("/admin/sessions/live");
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
    }[]
  >(`/admin/content/tests${q}`);
}

export function createContentTest(payload: {
  code: string;
  title: string;
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  content: object;
  answerKey?: object;
  durationMin?: number;
}) {
  return apiFetch("/admin/content/tests", { method: "POST", body: payload });
}

export function publishContentTest(id: string) {
  return apiFetch(`/admin/content/tests/${id}/publish`, { method: "POST" });
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
