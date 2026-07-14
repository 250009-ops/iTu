"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PartnerCenter } from "@/lib/marketing/server-data";
import { CenterLogo } from "./center-logo";
import { cn } from "@/lib/utils";

/** Approximate width of one logo + name chip in the marquee row. */
const ITEM_WIDTH = 176;

function buildRow(
  centers: PartnerCenter[],
  containerWidth: number,
): { items: PartnerCenter[]; animate: boolean } {
  if (centers.length === 0) return { items: [], animate: false };

  const naturalWidth = centers.length * ITEM_WIDTH;
  const fillsRow = naturalWidth >= containerWidth * 0.92;

  if (fillsRow) {
    // Enough unique centres — show each once, no duplicate logos in the row.
    return { items: centers, animate: false };
  }

  // Too few — repeat the existing set horizontally until the row is full,
  // then duplicate once more so the marquee loop is seamless.
  let filled: PartnerCenter[] = [];
  while (filled.length * ITEM_WIDTH < containerWidth * 1.05) {
    filled = filled.concat(centers);
  }
  return { items: [...filled, ...filled], animate: true };
}

function PartnerChip({ center }: { center: PartnerCenter }) {
  return (
    <Link
      href={`/centers/${center.slug}`}
      className="group inline-flex shrink-0 items-center gap-3 rounded-xl px-2 py-1 transition-colors"
      aria-label={center.name}
    >
      <CenterLogo name={center.name} size="sm" />
      <span className="text-base font-semibold text-slate-500 transition-colors group-hover:text-navy">
        {center.name}
      </span>
    </Link>
  );
}

// One horizontal row of Edu Center logos. Repeats existing partners only when
// there are too few to fill the viewport width; stops repeating once the count
// is enough to cover the line naturally.
export function PartnerMarquee({
  centers,
  heading = "Trusted by Edu Centers",
}: {
  centers: PartnerCenter[];
  heading?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const { items, animate } = useMemo(
    () => buildRow(centers, containerWidth || (typeof window !== "undefined" ? window.innerWidth : 1200)),
    [centers, containerWidth],
  );

  if (centers.length === 0) return null;

  return (
    <section className="border-y border-border bg-white py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
        {heading}
      </p>
      <div ref={containerRef} className="relative mx-auto mt-6 max-w-6xl px-6">
        {animate ? (
          <div className="marquee-mask overflow-hidden">
            <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
              {items.map((center, i) => (
                <PartnerChip key={`${center.id}-${i}`} center={center} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-start gap-x-10 gap-y-4">
            {items.map((center) => (
              <PartnerChip key={center.id} center={center} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
