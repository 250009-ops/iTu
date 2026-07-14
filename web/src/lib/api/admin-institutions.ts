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
  students: number;
  examiners: number;
  enrollments: number;
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

export function patchInstitution(
  id: string,
  body: {
    name?: string;
    status?: "PENDING" | "ACTIVE" | "SUSPENDED";
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
