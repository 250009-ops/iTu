"use client";

import Link from "next/link";
import { Download, Monitor } from "lucide-react";
import {
  DESKTOP_PLATFORMS,
  useDesktopReleases,
} from "@/hooks/use-desktop-releases";
import { platformLabel } from "@/lib/desktop/detect-platform";
import { cn } from "@/lib/utils";

type Variant = "full" | "compact";

export function DesktopDownloadCard({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: Variant;
}) {
  const {
    releases,
    loading,
    platform,
    platformLabel: osLabel,
    primaryUrl,
    version,
    hasDownload,
  } = useDesktopReleases();

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
            <Monitor className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-navy">Desktop app</p>
            <p className="text-sm text-muted">
              Download for mock-day stability and session recovery.
            </p>
          </div>
        </div>
        {loading ? (
          <span className="text-sm text-muted">Loading…</span>
        ) : hasDownload && primaryUrl ? (
          <a
            href={primaryUrl}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-light"
          >
            <Download className="h-4 w-4" />
            {osLabel}
            {version ? ` v${version}` : ""}
          </a>
        ) : (
          <Link
            href="/download"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-navy"
          >
            Download options
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
          <Monitor className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-navy">Desktop app</h2>
          <p className="mt-1 text-sm text-muted">
            Install iTestU for your role portal with better exam recovery when
            connection or power drops. One app for students, teachers, admins,
            and centres — sign in and continue where you left off.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-sm text-muted">Loading release info…</p>
        ) : hasDownload && primaryUrl ? (
          <a
            href={primaryUrl}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-light"
          >
            <Download className="h-4 w-4" />
            Download for {osLabel}
            {version ? ` v${version}` : ""}
          </a>
        ) : (
          <p className="text-sm text-muted">
            Desktop installers are being prepared.{" "}
            <Link href="/download" className="font-semibold text-navy underline">
              View download page
            </Link>{" "}
            or use Chrome/Edge in the meantime.
          </p>
        )}

        {releases && (
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            {DESKTOP_PLATFORMS.filter((p) => p !== platform).map((p) => {
              const artifact = releases.platforms[p];
              if (!artifact?.url) return null;
              return (
                <a
                  key={p}
                  href={artifact.url}
                  className="font-medium text-navy underline-offset-2 hover:underline"
                >
                  {platformLabel(p)}
                </a>
              );
            })}
            <Link
              href="/download"
              className="font-medium text-navy underline-offset-2 hover:underline"
            >
              Full download page
            </Link>
          </div>
        )}

        {releases?.platforms[platform]?.sha256 ? (
          <p className="break-all font-mono text-[11px] text-muted">
            SHA-256: {releases.platforms[platform].sha256}
          </p>
        ) : null}
      </div>
    </div>
  );
}
