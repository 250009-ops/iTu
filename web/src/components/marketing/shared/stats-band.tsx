import type { MarketingStat } from "@/lib/marketing/server-data";
import { CountUp } from "@/components/marketing/motion/count-up";
import { Stagger, StaggerItem } from "@/components/marketing/motion/reveal";

export function StatsBand({ stats }: { stats: MarketingStat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Stagger className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <StaggerItem key={stat.id} className="text-center">
              <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                <CountUp
                  value={stat.value}
                  decimals={stat.decimals ?? 0}
                  prefix={stat.prefix ?? ""}
                  suffix={stat.suffix ?? ""}
                />
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
