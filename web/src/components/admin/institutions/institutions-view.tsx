"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Coins,
  Gift,
  ImageOff,
  PauseCircle,
  Pencil,
  PlayCircle,
  Tag,
  X,
} from "lucide-react";
import {
  adjustInstitutionCredits,
  approveInstitution,
  approveInstitutionMarketingLogo,
  getAdminInstitutions,
  patchInstitution,
  rejectInstitution,
  rejectInstitutionMarketingLogo,
  type AdminInstitution,
} from "@/lib/api/admin-institutions";
import { InstitutionGrantSetDialog } from "@/components/admin/institutions/institution-grant-set-dialog";
import { useApiQuery } from "@/hooks/use-api-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  LoadingRow,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
  formatUZS,
} from "@/components/institution/ui";
import { PortalPage } from "@/components/portal/portal-page";

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Applications" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "rejected", label: "Rejected" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminInstitutionsView() {
  const [tab, setTab] = useState<TabId>("all");
  const { data, loading, refresh } = useApiQuery(
    () => getAdminInstitutions(tab),
    [tab],
  );
  const { data: allData } = useApiQuery(() => getAdminInstitutions("all"), []);
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [grantTarget, setGrantTarget] = useState<AdminInstitution | null>(null);
  const [editTarget, setEditTarget] = useState<AdminInstitution | null>(null);
  const [creditsTarget, setCreditsTarget] = useState<AdminInstitution | null>(
    null,
  );
  const [pricingTarget, setPricingTarget] = useState<AdminInstitution | null>(
    null,
  );

  const summary = {
    total: allData?.length ?? 0,
    pending: allData?.filter((i) => i.status === "pending").length ?? 0,
    active: allData?.filter((i) => i.status === "active").length ?? 0,
    suspended: allData?.filter((i) => i.status === "suspended").length ?? 0,
    totalGrants:
      allData
        ?.filter((i) => i.status === "active" || i.status === "suspended")
        .reduce((a, i) => a + i.grantedSetCount, 0) ?? 0,
  };

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await approveInstitution(id);
      toast("Institution approved", {
        description: "An activation email was sent to the owner.",
        variant: "success",
      });
      await refresh({ silent: true });
    } catch (err) {
      toast("Approval failed", {
        description: getErrorMessage(err, "Could not approve institution."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectInstitution(id);
      toast("Institution rejected", { variant: "info" });
      await refresh({ silent: true });
    } catch (err) {
      toast("Action failed", {
        description: getErrorMessage(err, "Could not reject institution."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetStatus(
    inst: AdminInstitution,
    status: "ACTIVE" | "SUSPENDED",
  ) {
    setBusyId(inst.id);
    try {
      await patchInstitution(inst.id, { status });
      toast(status === "SUSPENDED" ? "Institution suspended" : "Institution activated", {
        variant: status === "SUSPENDED" ? "warning" : "success",
      });
      await refresh({ silent: true });
    } catch (err) {
      toast("Status update failed", {
        description: getErrorMessage(err, "Could not update institution status."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleApproveLogo(id: string) {
    setBusyId(id);
    try {
      await approveInstitutionMarketingLogo(id);
      toast("Marketing logo approved", {
        description: "It will appear in the Trusted by strip.",
        variant: "success",
      });
      await refresh({ silent: true });
    } catch (err) {
      toast("Logo approval failed", {
        description: getErrorMessage(err, "Could not approve logo."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectLogo(id: string) {
    setBusyId(id);
    try {
      await rejectInstitutionMarketingLogo(id, "Logo not suitable for marketing");
      toast("Marketing logo disapproved", {
        description: "Marketing will show the centre name instead.",
        variant: "info",
      });
      await refresh({ silent: true });
    } catch (err) {
      toast("Logo disapproval failed", {
        description: getErrorMessage(err, "Could not disapprove logo."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalPage>
      <PageHeader
        breadcrumb="Admin &gt; Institutions"
        title="Institutions"
        description="Review partner applications, grant mock sets, and manage wholesale pricing."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total centers" value={summary.total} />
        <StatCard label="Applications" value={summary.pending} accent="amber" />
        <StatCard label="Active" value={summary.active} accent="emerald" />
        <StatCard
          label="Suspended"
          value={summary.suspended}
          accent="red"
        />
      </div>

      <SectionCard>
        <div className="flex items-center gap-1 border-b border-border px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                tab === t.id ? "bg-navy text-white" : "text-muted hover:bg-slate-100",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingRow />
        ) : !data?.length ? (
          <EmptyState message="No institutions in this view." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Center</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Marketing logo</th>
                  <th className="px-5 py-3 font-medium">Credits</th>
                  <th className="px-5 py-3 font-medium">Wholesale</th>
                  <th className="px-5 py-3 font-medium">Granted sets</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((inst) => (
                  <tr key={inst.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy">{inst.name}</p>
                      <p className="text-xs text-muted">
                        {inst.city ?? "—"}
                        {inst.owner && !inst.owner.activated && " · owner not activated"}
                        {inst.students > 0 && ` · ${inst.students} students`}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-navy">{inst.contactName}</p>
                      <p className="text-xs text-muted">{inst.contactEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">
                      {formatApplicationSource(inst.applicationSource)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={inst.status} />
                    </td>
                    <td className="px-5 py-3">
                      <MarketingLogoCell
                        institution={inst}
                        busy={busyId === inst.id}
                        onApprove={() => handleApproveLogo(inst.id)}
                        onDisapprove={() => handleRejectLogo(inst.id)}
                      />
                    </td>
                    <td className="px-5 py-3 font-semibold text-navy">
                      {inst.status === "active" || inst.status === "suspended"
                        ? inst.creditBalance
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {inst.status === "active" || inst.status === "suspended"
                        ? formatUZS(inst.wholesalePrice, inst.currency)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 font-semibold text-navy">
                      {inst.grantedSetCount}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {inst.status === "pending" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === inst.id}
                              onClick={() => setEditTarget(inst)}
                              title="Edit owner details"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={busyId === inst.id}
                              onClick={() => handleApprove(inst.id)}
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === inst.id}
                              onClick={() => handleReject(inst.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : inst.status === "rejected" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busyId === inst.id}
                            onClick={() => handleApprove(inst.id)}
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </Button>
                        ) : inst.status === "active" ||
                          inst.status === "suspended" ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setGrantTarget(inst)}
                            >
                              <Gift className="h-4 w-4" />
                              Grant set
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === inst.id}
                              onClick={() => setCreditsTarget(inst)}
                              title="Adjust credits"
                            >
                              <Coins className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === inst.id}
                              onClick={() => setPricingTarget(inst)}
                              title="Edit wholesale price"
                            >
                              <Tag className="h-4 w-4" />
                            </Button>
                            {inst.status === "active" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={busyId === inst.id}
                                onClick={() =>
                                  handleSetStatus(inst, "SUSPENDED")
                                }
                                title="Suspend"
                              >
                                <PauseCircle className="h-4 w-4" />
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                loading={busyId === inst.id}
                                onClick={() => handleSetStatus(inst, "ACTIVE")}
                              >
                                <PlayCircle className="h-4 w-4" />
                                Activate
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="px-2 text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <InstitutionGrantSetDialog
        open={grantTarget != null}
        institution={grantTarget}
        onClose={() => setGrantTarget(null)}
        onGranted={() => void refresh({ silent: true })}
      />

      <EditOwnerModal
        institution={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => void refresh({ silent: true })}
      />

      <AdjustCreditsModal
        institution={creditsTarget}
        onClose={() => setCreditsTarget(null)}
        onSaved={() => void refresh({ silent: true })}
      />

      <EditWholesaleModal
        institution={pricingTarget}
        onClose={() => setPricingTarget(null)}
        onSaved={() => void refresh({ silent: true })}
      />
    </PortalPage>
  );
}

function formatApplicationSource(source: string | null | undefined): string {
  if (!source) return "—";
  if (source === "telegram") return "Telegram";
  if (source === "marketing-site") return "Website";
  return source;
}

function MarketingLogoCell({
  institution,
  busy,
  onApprove,
  onDisapprove,
}: {
  institution: AdminInstitution;
  busy: boolean;
  onApprove: () => void;
  onDisapprove: () => void;
}) {
  if (!institution.logoUrl) {
    return <span className="text-xs text-muted">Name only</span>;
  }

  const status = institution.marketingLogoStatus ?? "none";
  const canApprove = status === "pending" || status === "rejected";
  const canDisapprove = status === "approved" || status === "pending";

  return (
    <div className="flex min-w-[10.5rem] flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={institution.logoUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded border border-border bg-white object-contain p-0.5"
        />
        <StatusPill status={status === "none" ? "pending" : status} />
      </div>
      {canApprove || canDisapprove ? (
        <div className="flex flex-wrap gap-1">
          {canApprove ? (
            <Button
              variant="secondary"
              size="sm"
              loading={busy}
              onClick={onApprove}
              title="Approve logo for marketing Trusted-by strip"
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
          ) : null}
          {canDisapprove ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onDisapprove}
              title="Disapprove logo — marketing shows centre name"
            >
              <ImageOff className="h-3.5 w-3.5" />
              Disapprove
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EditOwnerModal({
  institution,
  onClose,
  onSaved,
}: {
  institution: AdminInstitution | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (institution) {
      setContactName(institution.contactName ?? "");
      setContactEmail(institution.contactEmail ?? "");
      setContactPhone(institution.contactPhone ?? "");
    }
  }, [institution]);

  async function handleSubmit() {
    if (!institution) return;
    setSaving(true);
    try {
      await patchInstitution(institution.id, {
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      toast("Owner details updated", { variant: "success" });
      onSaved();
      onClose();
    } catch (err) {
      toast("Update failed", {
        description: getErrorMessage(err, "Could not update owner details."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={institution != null}
      onClose={onClose}
      ariaLabel="Edit owner details"
      className="max-w-md"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">
          Owner details · {institution?.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4 p-5">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          The owner account is created from this email on approval. If approval
          fails because the email is already registered, set a different owner
          email here, then approve.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Owner name
          </span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Owner email
          </span>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Owner phone
          </span>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={saving} onClick={handleSubmit}>
          Save changes
        </Button>
      </div>
    </Modal>
  );
}

function AdjustCreditsModal({
  institution,
  onClose,
  onSaved,
}: {
  institution: AdminInstitution | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (institution) {
      setDelta("");
      setNote("");
    }
  }, [institution]);

  async function handleSubmit() {
    if (!institution) return;
    const parsed = Number.parseInt(delta, 10);
    if (!Number.isFinite(parsed) || parsed === 0) {
      toast("Enter a non-zero integer delta", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      await adjustInstitutionCredits(
        institution.id,
        parsed,
        note.trim() || undefined,
      );
      toast("Credits adjusted", {
        description: `New balance reflects ${parsed > 0 ? "+" : ""}${parsed}.`,
        variant: "success",
      });
      onSaved();
      onClose();
    } catch (err) {
      toast("Credit adjustment failed", {
        description: getErrorMessage(err, "Could not adjust credits."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={institution != null}
      onClose={onClose}
      ariaLabel="Adjust credits"
      className="max-w-md"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">
          Adjust credits · {institution?.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted">
          Current balance:{" "}
          <span className="font-semibold text-navy">
            {institution?.creditBalance ?? 0}
          </span>
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Delta (positive to grant, negative to deduct)
          </span>
          <input
            type="number"
            step={1}
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
            placeholder="e.g. 10 or -5"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Note (optional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={240}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
            placeholder="Admin adjustment"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={saving} onClick={handleSubmit}>
          Apply adjustment
        </Button>
      </div>
    </Modal>
  );
}

function EditWholesaleModal({
  institution,
  onClose,
  onSaved,
}: {
  institution: AdminInstitution | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (institution) {
      setPrice(String(institution.wholesalePrice ?? 0));
    }
  }, [institution]);

  async function handleSubmit() {
    if (!institution) return;
    const parsed = Number(price);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast("Enter a valid non-negative price", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      await patchInstitution(institution.id, { wholesalePrice: parsed });
      toast("Wholesale price updated", { variant: "success" });
      onSaved();
      onClose();
    } catch (err) {
      toast("Update failed", {
        description: getErrorMessage(err, "Could not update wholesale price."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={institution != null}
      onClose={onClose}
      ariaLabel="Edit wholesale price"
      className="max-w-md"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">
          Wholesale price · {institution?.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-navy">
            Price per credit ({institution?.currency ?? "UZS"})
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={saving} onClick={handleSubmit}>
          Save price
        </Button>
      </div>
    </Modal>
  );
}
