"use client";

import { useState } from "react";
import { PACKAGES, type MockPackage } from "@/lib/marketing/data";
import { PackageCard } from "@/components/marketing/shared/package-card";
import { cn } from "@/lib/utils";

type Filter = "all" | "ACADEMIC" | "GENERAL_TRAINING";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All Packages" },
  { id: "ACADEMIC", label: "Academic" },
  { id: "GENERAL_TRAINING", label: "General Training" },
];

export function PackageGrid({ packages = PACKAGES }: { packages?: MockPackage[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all" ? packages : packages.filter((p) => p.examType === filter);

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
        {visible.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}
