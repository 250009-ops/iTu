"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import {
  checkoutPracticePackage,
  getPracticePackages,
  type PracticeProductPackage,
} from "@/lib/api/practice";
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
        </div>
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-navy">{pkg.title}</h2>
                  {pkg.description && (
                    <p className="mt-1 text-sm text-muted">{pkg.description}</p>
                  )}
                  <ul className="mt-3 space-y-1 text-sm text-muted">
                    {Object.entries(pkg.bundle)
                      .filter(([, v]) => (v ?? 0) > 0)
                      .map(([k, v]) => (
                        <li key={k}>
                          {v}× {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-navy">
                    {formatPrice(pkg.price, pkg.currency)}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    disabled={checkingOut === pkg.id}
                    onClick={() => void handleBuy(pkg.id)}
                  >
                    Buy bundle
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ApiDataShell>
  );
}
