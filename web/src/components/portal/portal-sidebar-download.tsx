"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { useDesktopReleases } from "@/hooks/use-desktop-releases";
import { cn } from "@/lib/utils";

type Props = {
  collapsed?: boolean;
  className?: string;
};

/** Persistent sidebar promo — visible on every portal without opening Help. */
export function PortalSidebarDownload({ collapsed, className }: Props) {
  const { loading, platformLabel: osLabel, primaryUrl, version, hasDownload } =
    useDesktopReleases();

  if (collapsed) {
    return (
      <div className={cn("border-t border-white/10 p-3", className)}>
        <Link
          href="/download"
          title="Download desktop app"
          className="flex h-10 w-full items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/15"
        >
          <BrandMarkIcon size="sm" className="shadow-none" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-t border-white/10 p-3",
        className,
      )}
    >
      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <div className="flex items-start gap-2.5">
          <BrandMarkIcon size="sm" className="shadow-none" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Desktop app</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
              Safer mock delivery if connection or power drops.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {loading ? (
            <span className="text-[11px] text-slate-500">Loading…</span>
          ) : hasDownload && primaryUrl ? (
            <a
              href={primaryUrl}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-navy transition-colors hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download for {osLabel}
              {version ? ` · v${version}` : ""}
            </a>
          ) : (
            <Link
              href="/download"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10"
            >
              View download options
            </Link>
          )}
          <Link
            href="/download"
            className="text-center text-[11px] font-medium text-slate-400 hover:text-white"
          >
            Other platforms
          </Link>
        </div>
      </div>
    </div>
  );
}
