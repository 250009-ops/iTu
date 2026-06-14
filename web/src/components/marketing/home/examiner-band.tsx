import { Check, TrendingUp } from "lucide-react";
import { Glow, Pill, CtaButton } from "@/components/marketing/ui/primitives";
import { Reveal } from "@/components/marketing/motion/reveal";

const BENEFITS = [
  "Set your own availability — grade when it suits you",
  "Grade Writing with structured criteria tools",
  "Run live Speaking sessions by video, from anywhere",
  "Transparent payout reports, weekly payments",
];

export function ExaminerBand({ examiners = "320+" }: { examiners?: string }) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
      <Glow className="-left-20 top-0 h-80 w-80" color="rgba(139,92,246,0.22)" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
        <Reveal direction="left">
          <Pill tone="onNavy">For Examiners</Pill>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Certified examiner? Turn your expertise into income.
          </h2>
          <p className="mt-4 max-w-md text-lg text-slate-300">
            Join {examiners} examiners earning from flexible, fully remote grading and live Speaking
            sessions.
          </p>
          <ul className="mt-6 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-slate-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <CtaButton href="/for-teachers" variant="onNavy" size="lg" withArrow>
              Become an examiner
            </CtaButton>
          </div>
        </Reveal>

        <Reveal direction="right">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              This month
            </p>
            <p className="mt-2 text-4xl font-extrabold text-white">$1,240</p>
            <p className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400">
              <TrendingUp className="h-4 w-4" /> +18% vs last month
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-violet-400" /> Writing tasks graded
                </span>
                <span className="text-sm text-slate-400">
                  38 <span className="font-bold text-white">$760</span>
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Speaking sessions
                </span>
                <span className="text-sm text-slate-400">
                  24 <span className="font-bold text-white">$480</span>
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm text-slate-300">Next payout</span>
                <span className="text-sm font-semibold text-emerald-400">Jun 14 — $620</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
