"use client";

import Link from "next/link";
import { Download, Monitor, Shield, Wifi } from "lucide-react";
import { Reveal } from "@/components/marketing/motion/reveal";
import { Glow, Pill, Section } from "@/components/marketing/ui/primitives";
import {
  DESKTOP_PLATFORMS,
  useDesktopReleases,
} from "@/hooks/use-desktop-releases";
import { platformLabel } from "@/lib/desktop/detect-platform";
import { cn } from "@/lib/utils";

const BENEFITS = [
  {
    icon: Shield,
    title: "Safer on mock day",
    body: "If power or Wi‑Fi drops, your session pauses and answers stay saved until an admin resumes you.",
  },
  {
    icon: Monitor,
    title: "One app, every role",
    body: "Students, teachers, examiners, centre admins, and platform ops — sign in and go to your portal.",
  },
  {
    icon: Wifi,
    title: "Built for exam rooms",
    body: "Fewer browser tab accidents, clearer fullscreen delivery, and a stable window for long CBT sections.",
  },
] as const;

type Props = {
  className?: string;
  showAllPlatforms?: boolean;
};

export function MarketingDesktopAppSection({
  className,
  showAllPlatforms = true,
}: Props) {
  const { loading, platform, platformLabel: osLabel, primaryUrl, version, releases, hasDownload } =
    useDesktopReleases();

  return (
    <Section className={cn("relative overflow-hidden bg-slate-50", className)}>
      <Glow className="-left-24 top-0 h-72 w-72" color="rgba(14,165,233,0.18)" />
      <Glow className="right-0 bottom-0 h-72 w-72" color="rgba(15,23,42,0.08)" />

      <Reveal className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <Pill tone="navy">
            <Monitor className="h-3.5 w-3.5" /> Desktop app
          </Pill>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Sit your mock in the iTestU desktop app
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Download once for Windows, macOS, or Linux. Log in with your existing
            account — no separate student or teacher installer. Ideal for mock
            day when you want fewer browser surprises and stronger recovery if
            something interrupts your session.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {loading ? (
              <span className="text-sm text-muted">Checking latest release…</span>
            ) : hasDownload && primaryUrl ? (
              <a
                href={primaryUrl}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-navy px-6 text-sm font-semibold text-white shadow-lg shadow-navy/15 transition-all hover:-translate-y-0.5 hover:bg-navy-light"
              >
                <Download className="h-4 w-4" />
                Download for {osLabel}
                {version ? ` · v${version}` : ""}
              </a>
            ) : (
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-white px-6 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                Ask about desktop availability
              </Link>
            )}

            <Link
              href="/download"
              className="text-sm font-semibold text-navy underline-offset-4 hover:underline"
            >
              All platforms &amp; checksums
            </Link>
          </div>

          {showAllPlatforms && releases && (
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted">
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
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-navy">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
