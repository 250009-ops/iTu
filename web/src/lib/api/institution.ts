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
  mockLabel: string;
  costsCredit: boolean;
}

export interface EnrollmentPackagesGrouped {
  platform: EnrollmentPackageOption[];
  own: EnrollmentPackageOption[];
}

export function getInstitutionEnrollmentPackages() {
  return fetchEnrollmentPackages();
}

/** @deprecated Use getInstitutionEnrollmentPackages */
export interface CatalogPackageOption {
  id: string;
  title: string;
}

export function getInstitutionPackages() {
  return getInstitutionEnrollmentPackages().then((groups) => [
    ...groups.platform,
    ...groups.own,
  ]);
}
