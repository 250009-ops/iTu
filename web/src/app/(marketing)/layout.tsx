import type { Metadata } from "next";
import { SmoothScroll } from "@/components/marketing/motion/smooth-scroll";
import { SiteHeader } from "@/components/marketing/layout/site-header";
import { SiteFooter } from "@/components/marketing/layout/site-footer";
import { SITE } from "@/lib/marketing/data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.domain),
  title: {
    default: `${SITE.name} — Realistic IELTS Mock Exams with Real Examiners`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "IELTS mock exam",
    "IELTS practice test",
    "computer-delivered IELTS",
    "IELTS Writing feedback",
    "IELTS Speaking mock",
    "IELTS band score",
    "computer-delivered IELTS practice",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Realistic IELTS Mock Exams`,
    description: SITE.description,
    url: SITE.domain,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Realistic IELTS Mock Exams`,
    description: SITE.description,
  },
  alternates: { canonical: "/" },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  );
}
