"use client";

import Link from "next/link";
import { Download, Monitor, Shield, Wifi } from "lucide-react";
import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section, SectionHeading } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";
import {
  DESKTOP_PLATFORMS,
  useDesktopReleases,
} from "@/hooks/use-desktop-releases";
import { platformLabel } from "@/lib/desktop/detect-platform";
import { SITE } from "@/lib/marketing/data";

export function DownloadPageContent() {
  const { releases, loading, platform, platformLabel: osLabel, hasDownload, primaryUrl, version } =
    useDesktopReleases();

  return (
    <>
      <PageHero
        eyebrow="Desktop app"
        title="Download iTestU for your computer"
        subtitle="One installer for every role — students, teachers, examiners, centre admins, and platform ops. Sign in after install and go straight to your portal."
      />

      <Section className="pt-12">
        <Reveal className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <BrandMarkIcon size="lg" className="shadow-lg shadow-brand-red/30" />
                <div>
                  <h2 className="text-lg font-bold text-navy">
                    Recommended for {osLabel}
                  </h2>
                  <p className="text-sm text-muted">
                    {loading
                      ? "Checking latest release…"
                      : hasDownload
                        ? `Version ${version ?? "—"} · ${SITE.name} desktop shell`
                        : "Installers are being published — use the web app meanwhile."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {hasDownload && primaryUrl ? (
                <a
                  href={primaryUrl}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-semibold text-white hover:bg-navy-light sm:w-auto sm:px-8"
                >
                  <Download className="h-4 w-4" />
                  Download for {osLabel}
                </a>
              ) : (
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center rounded-xl border border-border px-6 text-sm font-semibold text-navy hover:bg-slate-50"
                >
                  Contact us about desktop availability
                </Link>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                {DESKTOP_PLATFORMS.map((p) => {
                  const artifact = releases?.platforms[p];
                  const isCurrent = p === platform;
                  return (
                    <div
                      key={p}
                      className={`rounded-xl border p-4 ${isCurrent ? "border-navy/30 bg-sky-50/40" : "border-border"}`}
                    >
                      <p className="font-semibold text-navy">{platformLabel(p)}</p>
                      {artifact?.url ? (
                        <a
                          href={
                            artifact.sha256
                              ? `${artifact.url}?v=${artifact.sha256.slice(0, 12)}`
                              : artifact.url
                          }
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-muted">Coming soon</p>
                      )}
                      {artifact?.sha256 ? (
                        <p className="mt-2 break-all font-mono text-[10px] text-muted">
                          {artifact.sha256}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section className="bg-white">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Why desktop"
            title="Built for mock day, not just browsing"
          />
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Session recovery",
              body: "Answers autosave to our servers. If connection or power fails, your mock pauses until an admin resumes you.",
            },
            {
              icon: Monitor,
              title: "Focused delivery",
              body: "A dedicated app window reduces accidental tab switches during timed CBT sections.",
            },
            {
              icon: Wifi,
              title: "Same account everywhere",
              body: "Continue on another laptop by signing in — your portal and mock progress follow you.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border p-5">
              <Icon className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-navy">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
