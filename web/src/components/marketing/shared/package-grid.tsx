"use client";

import { useEffect, useRef, useState } from "react";
import { PACKAGES, type MockPackage } from "@/lib/marketing/data";
import { PackageCard } from "@/components/marketing/shared/package-card";
import { cn } from "@/lib/utils";

type Filter = "all" | "ACADEMIC" | "GENERAL_TRAINING";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All Packages" },
  { id: "ACADEMIC", label: "Academic" },
];

export function PackageGrid({
  packages = PACKAGES,
  highlightSlug,
}: {
  packages?: MockPackage[];
  highlightSlug?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const highlightRef = useRef<HTMLDivElement>(null);

  const visible =
    filter === "all" ? packages : packages.filter((p) => p.examType === filter);

  useEffect(() => {
    if (!highlightSlug || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightSlug, visible.length]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-muted">Filter:</span>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f.id
                ? "bg-navy text-white"
                : "bg-white text-muted ring-1 ring-border hover:text-navy",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visible.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-dashed border-border bg-slate-50 px-6 py-10 text-center text-sm text-muted">
            {packages.length === 0
              ? "Packages are loading or temporarily unavailable — refresh shortly or contact support@itestu.uz."
              : "No packages match this filter yet."}
          </p>
        ) : (
          visible.map((pkg) => {
            const highlighted = highlightSlug === pkg.slug;
            return (
              <div
                key={pkg.id}
                ref={highlighted ? highlightRef : undefined}
                className={cn(
                  highlighted &&
                    "rounded-2xl ring-2 ring-brand-red ring-offset-2 ring-offset-background",
                )}
              >
                <PackageCard pkg={pkg} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
