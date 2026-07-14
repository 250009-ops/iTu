import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { fetchHeroStats } from "@/lib/marketing/server-data";

export async function AuthMarketingPanel() {
  const stats = await fetchHeroStats();
  const trust = [
    stats.mocks ? { value: stats.mocks, label: "Mocks delivered" } : null,
    stats.rating ? { value: `${stats.rating}★`, label: "Examiner rating" } : null,
    stats.examiners ? { value: stats.examiners, label: "Certified examiners" } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-navy p-8 text-white lg:p-12 xl:p-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.28) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-8 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(227,24,55,0.18) 0%, transparent 70%)" }}
      />

      <div className="relative flex items-center justify-between">
        <Link href="/">
          <BrandMark size="lg" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl xl:text-[2.75rem] xl:leading-[1.12]">
          Your real IELTS band is{" "}
          <span className="bg-gradient-to-r from-sky-400 to-sky-200 bg-clip-text text-transparent">
            one mock away.
          </span>
        </h2>

        <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <span className="text-xl font-extrabold leading-none">8.5</span>
            <span className="text-[9px] font-medium uppercase tracking-wide">Band</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              ["L", "9", "text-sky-300"],
              ["R", "8.5", "text-emerald-300"],
              ["W", "8", "text-violet-300"],
              ["S", "8.5", "text-rose-300"],
            ].map(([letter, band, color]) => (
              <div key={letter}>
                <p className={`text-[11px] font-bold ${color}`}>{letter}</p>
                <p className="text-sm font-semibold text-white">{band}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative space-y-6">
        {trust.length > 0 ? (
          <div className="flex items-center gap-8">
            {trust.map((item) => (
              <div key={item.label}>
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="text-xs text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} itestu. For practice only.
        </p>
      </div>
    </div>
  );
}
