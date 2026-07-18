"use client";

import Link from "next/link";
import { Download, Monitor } from "lucide-react";
import { useDesktopReleases } from "@/hooks/use-desktop-releases";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** When true, show text label on sm+ screens */
  showLabel?: boolean;
};

export function PortalHeaderDownloadButton({ className, showLabel = true }: Props) {
  const { loading, primaryUrl, hasDownload } = useDesktopReleases();

  if (loading) return null;

  const href = hasDownload && primaryUrl ? primaryUrl : "/download";
  const external = Boolean(hasDownload && primaryUrl);

  const content = (
    <>
      <Monitor className="h-4 w-4 shrink-0" />
      {showLabel ? (
        <span className="hidden text-sm font-semibold lg:inline">Get desktop app</span>
      ) : null}
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70 lg:hidden" />
    </>
  );

  const classes = cn(
    "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-slate-50 px-2.5 text-navy transition-colors hover:border-navy/20 hover:bg-white sm:px-3",
    className,
  );

  if (external) {
    return (
      <a href={href} className={classes} title="Download iTestU desktop app">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} title="Download iTestU desktop app">
      {content}
    </Link>
  );
}
