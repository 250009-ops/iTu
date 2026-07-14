import { apiFetch } from "./client";
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

export function enrollStudents(body: {
  studentIds: string[];
  packageId: string;
  mockDate: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
}) {
  return apiFetch<{
    enrolled: number;
    failed: { studentId: string; error?: string }[];
    creditBalance: number;
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

// ─── Catalog helpers reused for the enroll wizard ──────────────────────────

export interface CatalogPackageOption {
  id: string;
  title: string;
}

export function getInstitutionPackages() {
  return apiFetch<CatalogPackageOption[]>("/catalog/packages").catch(() => []);
}
