"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getInstitutionProfile,
  updateInstitutionProfile,
  uploadInstitutionLogo,
} from "@/lib/api/institution";
import { getErrorMessage } from "@/lib/api/errors";
import { InstitutionSettingsFooter } from "@/components/institution/settings/settings-footer";
import { InstitutionSettingsHeader } from "@/components/institution/settings/settings-header";
import { InstitutionSettingsNav } from "@/components/institution/settings/settings-nav";
import { ProfilePanel } from "@/components/institution/settings/profile-panel";
import { PublicPagePanel } from "@/components/institution/settings/public-page-panel";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  countUnsavedChanges,
  profileFormFromData,
  type InstitutionProfileForm,
  type InstitutionSettingsTab,
} from "@/lib/institution/settings-tabs";
import { useToast } from "@/components/ui/toast";

function formatLastSaved(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function InstitutionSettingsView() {
  const { data, loading, error, refresh } = useApiQuery(getInstitutionProfile);
  const { toast } = useToast();
  const [tab, setTab] = useState<InstitutionSettingsTab>("profile");
  const [form, setForm] = useState<InstitutionProfileForm | null>(null);
  const [savedForm, setSavedForm] = useState<InstitutionProfileForm | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [lastSaved, setLastSaved] = useState("—");

  useEffect(() => {
    if (!data) return;
    const next = profileFormFromData(data);
    setForm(next);
    setSavedForm(next);
    setLogoUrl(data.logoUrl ?? null);
    setLastSaved(formatLastSaved(new Date()));
  }, [data]);

  const unsavedChanges = useMemo(() => {
    if (!form || !savedForm) return 0;
    return countUnsavedChanges(form, savedForm);
  }, [form, savedForm]);

  function handleChange(patch: Partial<InstitutionProfileForm>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleDiscard() {
    if (!savedForm) return;
    setForm(savedForm);
    toast("Changes discarded", {
      description: "Unsaved profile edits have been reverted.",
      variant: "info",
    });
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await updateInstitutionProfile(form);
      setSavedForm(form);
      setLastSaved(formatLastSaved(new Date()));
      toast("Profile updated", {
        description: "Your center profile has been saved.",
        variant: "success",
      });
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

  async function handleLogoUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast("File too large", {
        description: "Logo must be 2 MB or smaller.",
        variant: "error",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const updated = await uploadInstitutionLogo(file);
      setLogoUrl(updated.logoUrl ?? null);
      toast("Logo updated", {
        description: "Your logo now appears in the partners carousel.",
        variant: "success",
      });
      await refresh({ silent: true });
    } catch (err) {
      toast("Upload failed", {
        description: getErrorMessage(err, "Could not upload logo."),
        variant: "error",
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    toast("Copied to clipboard", { variant: "info" });
  }

  const canSave = tab === "profile";

  return (
    <ApiDataShell loading={loading} error={error}>
      {data && form ? (
      <PortalPage>
            <InstitutionSettingsHeader
              unsavedChanges={unsavedChanges}
              saving={saving}
              canSave={canSave}
              onSave={handleSave}
            />

            <div className="flex flex-col gap-6 lg:flex-row">
              <aside className="w-full shrink-0 lg:w-56">
                <InstitutionSettingsNav active={tab} onChange={setTab} />
              </aside>

              <div className="min-w-0 flex-1 rounded-xl border border-border bg-white shadow-sm">
                {tab === "profile" ? (
                  <ProfilePanel
                    form={form}
                    logoUrl={logoUrl}
                    uploadingLogo={uploadingLogo}
                    onChange={handleChange}
                    onLogoUpload={handleLogoUpload}
                  />
                ) : (
                  <PublicPagePanel profile={data} onCopy={copy} />
                )}

                <InstitutionSettingsFooter
                  lastSaved={lastSaved}
                  unsavedChanges={unsavedChanges}
                  saving={saving}
                  canSave={canSave}
                  onSave={handleSave}
                  onDiscard={handleDiscard}
                />
              </div>
            </div>
      </PortalPage>
      ) : null}
    </ApiDataShell>
  );
}
