import { apiFetch } from "./client";
import type { AdminPermission } from "@/lib/admin/permissions";

export type AdminTeamMember = {
  id: string;
  email: string;
  name: string;
  isMainAdmin: boolean;
  fullAccess: boolean;
  permissions: AdminPermission[] | null;
  active: boolean;
  pendingInvite: boolean;
  invitedBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPermissionCatalogItem = {
  key: AdminPermission;
  label: string;
  group: string;
};

export function listAdminTeam() {
  return apiFetch<{
    admins: AdminTeamMember[];
    catalog: AdminPermissionCatalogItem[];
  }>("/admin/admins");
}

export function inviteAdmin(payload: {
  name: string;
  email: string;
  permissions: AdminPermission[];
}) {
  return apiFetch<{ invited: boolean; admin: AdminTeamMember }>(
    "/admin/admins/invite",
    { method: "POST", body: payload },
  );
}

export function updateAdmin(
  id: string,
  payload: {
    name?: string;
    permissions?: AdminPermission[];
    active?: boolean;
  },
) {
  return apiFetch<{ updated: boolean; admin: AdminTeamMember }>(
    `/admin/admins/${id}`,
    { method: "PATCH", body: payload },
  );
}

export function resendAdminInvite(id: string) {
  return apiFetch<{ sent: boolean }>(`/admin/admins/${id}/resend-invite`, {
    method: "POST",
  });
}
