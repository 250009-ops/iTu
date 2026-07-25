"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Shield, UserPlus } from "lucide-react";
import { PortalPage } from "@/components/portal/portal-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  inviteAdmin,
  listAdminTeam,
  resendAdminInvite,
  updateAdmin,
  type AdminTeamMember,
} from "@/lib/api/admin-admins";
import {
  ADMIN_PERMISSION_GROUPS,
  ADMIN_PERMISSION_LABELS,
  ASSIGNABLE_ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

function PermissionToggles({
  value,
  onChange,
  disabled,
}: {
  value: AdminPermission[];
  onChange: (next: AdminPermission[]) => void;
  disabled?: boolean;
}) {
  const toggle = (key: AdminPermission) => {
    if (disabled) return;
    if (value.includes(key)) {
      onChange(value.filter((item) => item !== key));
    } else {
      onChange([...value, key]);
    }
  };

  return (
    <div className="space-y-4">
      {ADMIN_PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            {group.label}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.keys.map((key) => {
              if (!ASSIGNABLE_ADMIN_PERMISSIONS.includes(key)) return null;
              const checked = value.includes(key);
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-2.5",
                    disabled && "opacity-60",
                  )}
                >
                  <span className="text-sm font-medium text-navy">
                    {ADMIN_PERMISSION_LABELS[key]}
                  </span>
                  <Switch
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(key)}
                    aria-label={ADMIN_PERMISSION_LABELS[key]}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminCard({
  admin,
  onSaved,
}: {
  admin: AdminTeamMember;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(admin.name);
  const [permissions, setPermissions] = useState<AdminPermission[]>(
    admin.permissions ?? [...ASSIGNABLE_ADMIN_PERMISSIONS],
  );
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setName(admin.name);
    setPermissions(admin.permissions ?? [...ASSIGNABLE_ADMIN_PERMISSIONS]);
  }, [admin]);

  const dirty =
    !admin.isMainAdmin &&
    (name.trim() !== admin.name ||
      JSON.stringify([...permissions].sort()) !==
        JSON.stringify([...(admin.permissions ?? [])].sort()));

  const save = async () => {
    setSaving(true);
    try {
      await updateAdmin(admin.id, {
        name: name.trim(),
        permissions,
      });
      toast("Admin updated");
      await onSaved();
    } catch (err) {
      toast("Update failed", {
        description:
          err instanceof ApiError ? err.message : "Could not save changes",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (active: boolean) => {
    setSaving(true);
    try {
      await updateAdmin(admin.id, { active });
      toast(active ? "Admin reactivated" : "Admin deactivated");
      await onSaved();
    } catch (err) {
      toast("Update failed", {
        description:
          err instanceof ApiError ? err.message : "Could not update status",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await resendAdminInvite(admin.id);
      toast("Invite email sent");
    } catch (err) {
      toast("Resend failed", {
        description:
          err instanceof ApiError ? err.message : "Could not resend invite",
        variant: "error",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-5 shadow-sm",
        !admin.active && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-navy">{admin.name}</h3>
            {admin.isMainAdmin && (
              <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy">
                Main admin
              </span>
            )}
            {admin.fullAccess && !admin.isMainAdmin && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Full access (legacy)
              </span>
            )}
            {admin.pendingInvite && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                Pending invite
              </span>
            )}
            {!admin.active && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                Deactivated
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">{admin.email}</p>
        </div>
        {!admin.isMainAdmin && (
          <div className="flex flex-wrap gap-2">
            {admin.pendingInvite && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={resending}
                onClick={() => void resend()}
              >
                <Mail className="h-3.5 w-3.5" />
                Resend invite
              </Button>
            )}
            <Button
              type="button"
              variant={admin.active ? "danger" : "secondary"}
              size="sm"
              loading={saving}
              onClick={() => void setActive(!admin.active)}
            >
              {admin.active ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        )}
      </div>

      {admin.isMainAdmin ? (
        <p className="mt-4 text-sm text-muted">
          Full access is always granted. Capabilities cannot be changed for the
          main admin.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="max-w-md space-y-1.5">
            <Label htmlFor={`admin-name-${admin.id}`}>Display name</Label>
            <Input
              id={`admin-name-${admin.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving || !admin.active}
            />
          </div>
          <PermissionToggles
            value={permissions}
            onChange={setPermissions}
            disabled={saving || !admin.active}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!dirty || !admin.active}
              loading={saving}
              onClick={() => void save()}
            >
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminsView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminTeamMember[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<AdminPermission[]>([
    "dashboard",
  ]);
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAdminTeam();
      setAdmins(data.admins);
    } catch (err) {
      toast("Could not load admins", {
        description:
          err instanceof ApiError ? err.message : "Please try again",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () =>
      [...admins].sort((a, b) => {
        if (a.isMainAdmin !== b.isMainAdmin) return a.isMainAdmin ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [admins],
  );

  const invite = async () => {
    setInviting(true);
    try {
      await inviteAdmin({
        name: name.trim(),
        email: email.trim(),
        permissions,
      });
      toast("Invite sent", {
        description: "They will receive an email to set their password.",
      });
      setName("");
      setEmail("");
      setPermissions(["dashboard"]);
      await load();
    } catch (err) {
      toast("Invite failed", {
        description:
          err instanceof ApiError ? err.message : "Could not invite admin",
        variant: "error",
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <PortalPage>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Admin team</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Invite admins and toggle which sidebar sections they can access.
              Only the main admin can manage this team.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-navy" />
            <h2 className="text-base font-semibold text-navy">Invite admin</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                disabled={inviting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={inviting}
              />
            </div>
          </div>
          <div className="mt-5">
            <PermissionToggles
              value={permissions}
              onChange={setPermissions}
              disabled={inviting}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              loading={inviting}
              disabled={!name.trim() || !email.trim() || permissions.length === 0}
              onClick={() => void invite()}
            >
              Send invite
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-navy">Team members</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((admin) => (
                <AdminCard key={admin.id} admin={admin} onSaved={load} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalPage>
  );
}
