import { apiFetch } from "./client";

export interface AdminInstitution {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  wholesalePrice: number;
  currency: string;
  creditBalance: number;
  grantedSetCount: number;
  students: number;
  examiners: number;
  enrollments: number;
  applicationSource: string | null;
  logoUrl: string | null;
  /** Marketing-site logo gate only (none | pending | approved | rejected). */
  marketingLogoStatus: string;
  marketingLogoReviewedAt: string | null;
  marketingLogoReviewNote: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
    activated: boolean;
  } | null;
  approvedAt: string | null;
  createdAt: string;
}

export function getAdminInstitutions(status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return apiFetch<AdminInstitution[]>(`/admin/institutions${query}`);
}

export function approveInstitution(id: string) {
  return apiFetch<AdminInstitution>(`/admin/institutions/${id}/approve`, {
    method: "POST",
  });
}

export function rejectInstitution(id: string) {
  return apiFetch<AdminInstitution>(`/admin/institutions/${id}/reject`, {
    method: "POST",
  });
}

export function approveInstitutionMarketingLogo(id: string, note?: string) {
  return apiFetch<AdminInstitution>(`/admin/institutions/${id}/logo/approve`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

export function rejectInstitutionMarketingLogo(id: string, note?: string) {
  return apiFetch<AdminInstitution>(`/admin/institutions/${id}/logo/reject`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

export function patchInstitution(
  id: string,
  body: {
    name?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
    wholesalePrice?: number;
    city?: string;
  },
) {
  return apiFetch<AdminInstitution>(`/admin/institutions/${id}`, {
    method: "PATCH",
    body,
  });
}

export function adjustInstitutionCredits(
  id: string,
  delta: number,
  note?: string,
) {
  return apiFetch<AdminInstitution>(`/admin/institutions/${id}/credits/adjust`, {
    method: "POST",
    body: { delta, note },
  });
}
