import type { MarketingStat } from "@/lib/marketing/server-data";
import { CountUp } from "@/components/marketing/motion/count-up";
import { Stagger, StaggerItem } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1 max-w-xs mx-auto",
  2: "grid-cols-2 max-w-xl mx-auto",
  3: "grid-cols-3 max-w-3xl mx-auto",
  4: "grid-cols-2 md:grid-cols-4",
};

export function StatsBand({ stats }: { stats: MarketingStat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Stagger
          className={cn(
            "grid gap-8",
            GRID_COLS[stats.length] ?? GRID_COLS[4],
          )}
        >
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
