"use client";

import { Copy, ExternalLink } from "lucide-react";
import { SettingsField } from "@/components/institution/settings/settings-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InstitutionProfile } from "@/lib/institution/types";
import { cn } from "@/lib/utils";

type PublicPagePanelProps = {
  profile: InstitutionProfile;
  onCopy: (text: string) => void;
};

function CopyField({
  label,
  hint,
  value,
  onCopy,
}: {
  label: string;
  hint: string;
  value: string | null | undefined;
  onCopy: (text: string) => void;
}) {
  const display = value ?? "Not available";

  return (
    <SettingsField label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <Input readOnly value={display} className="bg-slate-50 text-muted" />
        {value ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => onCopy(value)}>
              <Copy className="h-4 w-4" />
            </Button>
            {label === "Public Page URL" ? (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition-all hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    </SettingsField>
  );
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  rejected: "bg-slate-100 text-slate-600 border-border",
};

export function PublicPagePanel({ profile, onCopy }: PublicPagePanelProps) {
  const statusClass =
    statusStyles[profile.status] ?? "bg-slate-100 text-slate-600 border-border";

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Public Page</h2>
        <p className="mt-0.5 text-sm text-muted">
          Share these links so students can discover and join your center.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <CopyField
          label="Telegram Join Link"
          hint="Students sign up with your center via the Telegram bot"
          value={profile.joinDeepLink}
          onCopy={onCopy}
        />
        <CopyField
          label="Public Page URL"
          hint="Your center's marketing landing page on iTestU"
          value={profile.publicPageUrl}
          onCopy={onCopy}
        />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Account Details
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs text-muted">Wholesale price</p>
              <p className="mt-1 font-semibold text-navy">
                {profile.wholesalePrice.toLocaleString()} {profile.currency}
                <span className="text-sm font-normal text-muted"> / credit</span>
              </p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs text-muted">Center status</p>
              <p className="mt-1">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                    statusClass,
                  )}
                >
                  {profile.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
