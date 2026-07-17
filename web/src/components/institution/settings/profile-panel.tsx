"use client";

import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { SettingsField } from "@/components/institution/settings/settings-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InstitutionProfileForm } from "@/lib/institution/settings-tabs";
import { cn } from "@/lib/utils";

type ProfilePanelProps = {
  form: InstitutionProfileForm;
  logoUrl: string | null;
  uploadingLogo: boolean;
  onChange: (patch: Partial<InstitutionProfileForm>) => void;
  onLogoUpload: (file: File) => void;
};

export function ProfilePanel({
  form,
  logoUrl,
  uploadingLogo,
  onChange,
  onLogoUpload,
}: ProfilePanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Center Profile</h2>
        <p className="mt-0.5 text-sm text-muted">
          How your center appears to students and on the marketing site.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-slate-50/60 p-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${form.name} logo`}
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <span className="text-2xl font-bold text-navy">
              {form.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">Center logo</p>
          <p className="mt-0.5 text-xs text-muted">
            Shown in the partners carousel when uploaded. PNG, JPG, WebP or SVG
            · up to 2&nbsp;MB.
          </p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onLogoUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={uploadingLogo}
            onClick={() => logoInputRef.current?.click()}
          >
            {uploadingLogo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField
            label="Center Name"
            hint="Displayed in the portal header and on your public page"
          >
            <Input
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </SettingsField>
          <SettingsField label="City" hint="Shown on your public center page">
            <Input
              value={form.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </SettingsField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField
            label="Contact Name"
            hint="Primary contact for platform communications"
          >
            <Input
              value={form.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
            />
          </SettingsField>
          <SettingsField
            label="Contact Email"
            hint="Used for account and billing notifications"
          >
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
            />
          </SettingsField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField label="Contact Phone" hint="Optional phone for students">
            <Input
              value={form.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
            />
          </SettingsField>
          <SettingsField label="Address" hint="Street address shown on your public page">
            <Input
              value={form.address}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </SettingsField>
        </div>

        <SettingsField
          label="About the Center"
          hint="A short description for your public landing page"
        >
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            className={cn(
              "flex w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground",
              "placeholder:text-slate-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy",
              "resize-none",
            )}
          />
        </SettingsField>
      </div>
    </div>
  );
}
