"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PartnerCenter } from "@/lib/marketing/server-data";
import { CenterLogo } from "./center-logo";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 72;
const MIN_REPEAT = 8;

function PartnerColumn({
  center,
  repeat,
  reverse,
}: {
  center: PartnerCenter;
  repeat: number;
  reverse?: boolean;
}) {
  const items = useMemo(
    () => Array.from({ length: repeat * 2 }, () => center),
    [center, repeat],
  );

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden">
      <div
        className={cn(
          "flex w-full flex-col items-center gap-6",
          reverse ? "animate-marquee-vertical-reverse" : "animate-marquee-vertical",
        )}
      >
        {items.map((c, i) => (
          <Link
            key={`${c.id}-${i}`}
            href={`/centers/${c.slug}`}
            className="group flex shrink-0 flex-col items-center gap-2 px-3 py-1 transition-opacity hover:opacity-80"
            aria-label={c.name}
            style={{ minHeight: ITEM_HEIGHT }}
          >
            <CenterLogo name={c.name} logoUrl={c.logoUrl} size="md" />
            <span className="max-w-[9rem] truncate text-center text-sm font-semibold text-slate-500 transition-colors group-hover:text-navy">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Vertical partner wall — each Edu Center gets its own column, repeated enough
// times to fill the band height (1 center = one full column; 2+ = side-by-side).
export function PartnerMarquee({
  centers,
  heading = "Trusted by Edu Centers",
}: {
  centers: PartnerCenter[];
  heading?: string;
}) {
  const [repeat, setRepeat] = useState(MIN_REPEAT);

  useEffect(() => {
    function calc() {
      const band = Math.min(window.innerHeight * 0.38, 420);
      const needed = Math.ceil(band / ITEM_HEIGHT) + 2;
      setRepeat(Math.max(MIN_REPEAT, needed));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  if (centers.length === 0) return null;

  const columnCount = centers.length;
  const bandHeight = "min(420px, 38vh)";

  return (
    <section className="border-y border-border bg-white py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
        {heading}
      </p>
      <div
        className="marquee-mask-vertical relative mx-auto mt-6 max-w-6xl px-4 sm:px-6"
        style={{ height: bandHeight }}
      >
        <div
          className={cn(
            "flex h-full gap-4 sm:gap-8",
            columnCount === 1 && "justify-center",
          )}
        >
          {centers.map((center, i) => (
            <PartnerColumn
              key={center.id}
              center={center}
              repeat={repeat}
              reverse={i % 2 === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
