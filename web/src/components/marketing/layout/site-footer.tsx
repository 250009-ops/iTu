import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { FOOTER_COLUMNS, SITE } from "@/lib/marketing/data";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/">
              <BrandMark size="md" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              The professional IELTS mock exam platform. Real examiners, real feedback, real bands.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Get exam prep tips</p>
            <p className="text-sm text-slate-400">Band 7+ strategies, direct to your inbox.</p>
          </div>
          <form className="flex w-full max-w-sm gap-2">
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="h-11 flex-1 rounded-lg border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none"
            />
            <button
              type="submit"
              className="h-11 rounded-lg bg-brand-red px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover"
            >
              Subscribe
            </button>
          </form>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> SSL Secured
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> IDP-Faithful Format
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
