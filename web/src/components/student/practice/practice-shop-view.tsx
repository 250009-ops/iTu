"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import {
  checkoutPracticePackage,
  getPracticePackages,
  type PracticeProductPackage,
} from "@/lib/api/practice";
import { PRACTICE_CREDIT_META } from "@/lib/practice/hub";
import { formatPrice } from "@/lib/format-price";

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
      const result = await checkoutPracticePackage(packageId);
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
      <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
        <div>
          <Link href={basePath} className="text-sm text-muted hover:text-navy">
            ← Back to Practice Hub
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-navy">Buy practice credits</h1>
          <p className="mt-1 text-sm text-muted">
            Bundles add credits to your wallet for reading, listening, and AI writing
            practice.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-muted">
            No practice bundles are available yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-navy">{pkg.title}</h2>
                      {pkg.mostPopular && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Popular
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="mt-1 text-sm text-muted">{pkg.description}</p>
                    )}
                    <ul className="mt-4 space-y-2">
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
                              className="flex items-center gap-2 text-sm text-navy"
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: meta?.color ?? "#64748b" }}
                              />
                              <span className="font-medium">{value}×</span>
                              <span className="text-muted">
                                {meta?.label ?? key}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-navy">
                      {formatPrice(pkg.price, pkg.currency)}
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-3"
                      disabled={checkingOut === pkg.id}
                      onClick={() => void handleBuy(pkg.id)}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Buy bundle
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ApiDataShell>
  );
}
