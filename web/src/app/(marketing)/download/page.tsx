import type { Metadata } from "next";
import { DownloadPageContent } from "@/components/marketing/shared/download-page-content";
import { FinalCta } from "@/components/marketing/shared/final-cta";
import { SITE } from "@/lib/marketing/data";

export const metadata: Metadata = {
  title: `Download Desktop App — ${SITE.name}`,
  description:
    "Download the iTestU desktop app for Windows, macOS, or Linux. One app for students, teachers, examiners, and admins — safer mock delivery and session recovery.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <>
      <DownloadPageContent />
      <FinalCta
        eyebrow="Prefer the browser?"
        title="You can still sit your mock online"
        subtitle="Book a mock, check in from Chrome or Edge, and use the desktop app only on exam day if you prefer."
        primaryHref="/mock-exams"
        primaryLabel="Browse mock exams"
        secondaryHref="/how-it-works"
        secondaryLabel="How mock day works"
      />
    </>
  );
}
