import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Mail, Phone, Globe, Clock, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { Section } from "@/components/marketing/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { ContactForm } from "@/components/marketing/shared/contact-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact — Support, Demos & Enquiries",
  description:
    "Reach the IELTS Mock team for support, demo requests, institution pricing, or press enquiries. Live chat, email, and phone support available.",
  alternates: { canonical: "/contact" },
};

const METHODS = [
  { icon: MessageSquare, title: "Live chat", body: "Chat with our team in-app. Available weekdays 9am–6pm UTC.", action: "Open chat", accent: "bg-sky-50 text-sky-600", btn: "bg-sky-50 text-sky-700" },
  { icon: Mail, title: "Email support", body: "support@ieltsmock.com — we aim to reply within 4 hours.", action: "Send email", accent: "bg-violet-50 text-violet-600", btn: "bg-violet-50 text-violet-700" },
  { icon: Phone, title: "Call us", body: "For enterprise enquiries: +44 20 1234 5678 (Mon–Fri 9am–5pm UTC).", action: "Call now", accent: "bg-emerald-50 text-emerald-600", btn: "bg-emerald-50 text-emerald-700" },
  { icon: Globe, title: "Help centre", body: "Self-service documentation, video walkthroughs, and exam guides.", action: "Browse docs", accent: "bg-amber-50 text-amber-600", btn: "bg-amber-50 text-amber-700" },
];

const RESPONSE = [
  ["General support", "< 4 hours", "text-emerald-600"],
  ["Technical issues", "< 2 hours", "text-emerald-600"],
  ["Billing enquiries", "< 6 hours", "text-amber-600"],
  ["Institution sales", "< 1 business day", "text-violet-600"],
  ["Press & media", "< 2 business days", "text-violet-600"],
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="How can we help?"
        subtitle="Reach our team for support, demo requests, institution pricing, or press enquiries."
      />

      <Section className="pt-12">
        <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {METHODS.map((m) => (
            <StaggerItem key={m.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", m.accent)}>
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
              <span className={cn("mt-4 inline-flex rounded-lg px-3 py-1.5 text-sm font-semibold", m.btn)}>
                {m.action}
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section className="bg-white pt-0">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <Reveal direction="left">
            <ContactForm />
          </Reveal>

          <Reveal direction="right" className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h3 className="font-bold text-navy">Response times</h3>
              <ul className="mt-4 divide-y divide-border">
                {RESPONSE.map(([label, time, color]) => (
                  <li key={label} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted">{label}</span>
                    <span className={cn("font-semibold", color)}>{time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-navy p-6 text-white">
              <h3 className="font-bold">For institutions</h3>
              <p className="mt-2 text-sm text-slate-300">
                Looking for bulk pricing, a demo, or invoiced billing? Our institutions team is ready
                to help.
              </p>
              <Link
                href="/for-institutions"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover"
              >
                Institutional enquiry <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h3 className="inline-flex items-center gap-2 font-bold text-navy">
                <Clock className="h-4 w-4" /> Support hours
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                <li>Monday – Friday: 8:00 AM – 8:00 PM UTC</li>
                <li>Saturday: 9:00 AM – 5:00 PM UTC</li>
                <li>Sunday: Emergency support only</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
