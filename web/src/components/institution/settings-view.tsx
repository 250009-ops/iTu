"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import {
  getInstitutionProfile,
  updateInstitutionProfile,
} from "@/lib/api/institution";
import type { InstitutionProfile } from "@/lib/institution/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import {
  LoadingRow,
  PageHeader,
  SectionCard,
} from "@/components/institution/ui";

const TABS = [
  { id: "profile", label: "Center Profile" },
  { id: "public", label: "Public Page" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none";

export function InstitutionSettingsView() {
  const { data, loading, refresh } = useApiQuery(getInstitutionProfile);
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("profile");
  const [form, setForm] = useState<Partial<InstitutionProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        city: data.city ?? "",
        address: data.address ?? "",
        bio: data.bio ?? "",
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone ?? "",
      });
    }
  }, [data]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateInstitutionProfile(form);
      toast("Profile updated", { variant: "success" });
      await refresh({ silent: true });
    } catch (err) {
      toast("Save failed", {
        description: getErrorMessage(err, "Could not save changes."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    toast("Copied to clipboard", { variant: "info" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
      <PageHeader
        breadcrumb="Institution &gt; Settings"
        title="Settings"
        description="Manage your center profile and public sign-up link."
      />

      <div className="flex gap-1 rounded-lg border border-border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              tab === t.id ? "bg-navy text-white" : "text-muted hover:bg-slate-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white">
          <LoadingRow />
        </div>
      ) : tab === "profile" ? (
        <SectionCard title="Center profile">
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label="Center name">
              <input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="City">
              <input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Contact name">
              <input
                value={form.contactName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                value={form.contactEmail ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Contact phone">
              <input
                value={form.contactPhone ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="About the center">
                <textarea
                  rows={3}
                  value={form.bio ?? ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
            </div>
          </div>
          <div className="flex justify-end border-t border-border px-5 py-4">
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSave}
            >
              Save changes
            </Button>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Public sign-up">
          <div className="space-y-5 p-5">
            <div>
              <p className="text-xs font-semibold text-navy">
                Telegram join link
              </p>
              <p className="mb-2 text-xs text-muted">
                Share this link so students can sign up with your center via the
                bot.
              </p>
              <CopyRow value={data?.joinDeepLink} onCopy={copy} />
            </div>
            <div>
              <p className="text-xs font-semibold text-navy">Public page</p>
              <p className="mb-2 text-xs text-muted">
                Your center's public landing page.
              </p>
              <CopyRow value={data?.publicPageUrl} onCopy={copy} />
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-muted">
              Wholesale price:{" "}
              <strong className="text-navy">
                {data?.wholesalePrice.toLocaleString()} {data?.currency}
              </strong>{" "}
              per credit · Status:{" "}
              <strong className="capitalize text-navy">{data?.status}</strong>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function CopyRow({
  value,
  onCopy,
}: {
  value: string | null | undefined;
  onCopy: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value ?? "Not available"}
        className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm text-muted"
      />
      {value && (
        <Button variant="secondary" size="sm" onClick={() => onCopy(value)}>
          <Copy className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-navy">{label}</span>
      {children}
    </label>
  );
}
