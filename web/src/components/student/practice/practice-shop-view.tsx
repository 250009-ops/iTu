"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import {
  checkoutPracticePackage,
  getPracticePackages,
  type PracticeProductPackage,
} from "@/lib/api/practice";
import { PRACTICE_CREDIT_META } from "@/lib/practice/hub";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";

type Props = {
  basePath: string;
};

export function PracticeShopView({ basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PracticeProductPackage[]>([]);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    void getPracticePackages()
      .then(setPackages)
      .catch(() => setError("Failed to load packages"))
      .finally(() => setLoading(false));
  }, []);

  async function handleBuy(packageId: string) {
    setCheckingOut(packageId);
    try {
      const result = await checkoutPracticePackage(packageId, basePath);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      window.location.href = `${basePath}?purchased=1`;
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <div>
          <Link href={basePath} className="text-sm text-muted hover:text-navy">
            ← Back to Practice Hub
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-navy">Practice packages</h1>
          <p className="mt-1 text-sm text-muted">
            Choose a package to unlock specific reading, listening, and AI writing
            practice included in your plan.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-muted">
            No practice packages are available yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((pkg) => (
              <article
                key={pkg.id}
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm",
                  pkg.mostPopular
                    ? "border-brand-red ring-1 ring-brand-red/30"
                    : "border-slate-200",
                )}
              >
                {pkg.mostPopular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-red px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                    Most popular
                  </span>
                )}

                <div>
                  <h2 className="text-lg font-bold text-navy">{pkg.title}</h2>
                  {pkg.description && (
                    <p className="mt-1 text-sm text-muted">{pkg.description}</p>
                  )}
                </div>

                <p className="mt-4 text-3xl font-extrabold text-navy">
                  {formatPrice(pkg.price, pkg.currency)}
                </p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {Object.entries(pkg.bundle)
                    .filter(([, value]) => (value ?? 0) > 0)
                    .map(([key, value]) => {
                      const meta =
                        PRACTICE_CREDIT_META[
                          key as keyof typeof PRACTICE_CREDIT_META
                        ];
                      return (
                        <li
                          key={key}
                          className="flex gap-2.5 text-sm text-muted"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>
                            <span className="font-semibold text-navy">
                              {value}
                            </span>{" "}
                            {meta?.label?.toLowerCase() ?? key}
                          </span>
                        </li>
                      );
                    })}
                </ul>

                <Button
                  variant="primary"
                  size="sm"
                  className={cn(
                    "mt-6 w-full",
                    pkg.mostPopular && "bg-brand-red hover:bg-brand-red-hover",
                  )}
                  disabled={checkingOut === pkg.id}
                  onClick={() => void handleBuy(pkg.id)}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Get {pkg.title}
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </ApiDataShell>
  );
}
