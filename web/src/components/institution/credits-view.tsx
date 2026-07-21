"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import {
  createCreditCheckout,
  getInstitutionCredits,
} from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  LoadingRow,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
  formatUZS,
} from "@/components/institution/ui";
import { PortalPage } from "@/components/portal/portal-page";

export function InstitutionCreditsView() {
  const { data, loading } = useApiQuery(getInstitutionCredits);
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  async function handleCheckout() {
    if (!selected) return;
    setCheckingOut(true);
    try {
      const res = await createCreditCheckout(selected);
      window.location.href = res.checkoutUrl;
    } catch (err) {
      toast("Checkout failed", {
        description: getErrorMessage(err, "Could not start checkout."),
        variant: "error",
      });
      setCheckingOut(false);
    }
  }

  const currency = data?.currency ?? "UZS";

  return (
    <PortalPage>
      <PageHeader
        breadcrumb="Institution &gt; Credits"
        title="Credits"
        description="Buy mock credits in bulk and spend one per student enrollment."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Current balance"
          value={data?.balance ?? "—"}
          hint="Available credits"
          accent="red"
        />
        <StatCard
          label="Used this month"
          value={data?.creditsUsedThisMonth ?? "—"}
          accent="navy"
        />
        <StatCard
          label="Total purchased"
          value={data?.totalPurchased ?? "—"}
          hint={
            data ? `${formatUZS(data.wholesalePrice, currency)} / credit` : undefined
          }
          accent="emerald"
        />
      </div>

      <SectionCard title="Choose a credit pack">
        {loading ? (
          <LoadingRow />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            {data?.packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelected(pack.id)}
                className={cn(
                  "relative flex flex-col rounded-xl border-2 p-5 text-left transition",
                  selected === pack.id
                    ? "border-brand-red bg-rose-50/40"
                    : "border-border bg-white hover:border-navy/40",
                )}
              >
                {pack.popular && (
                  <span className="absolute -top-2 right-4 rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold text-white">
                    POPULAR
                  </span>
                )}
                <p className="text-sm font-semibold text-navy">{pack.label}</p>
                <p className="mt-2 text-3xl font-bold text-navy">
                  {pack.credits}
                  <span className="ml-1 text-sm font-medium text-muted">
                    credits
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatUZS(pack.pricePerCredit, currency)} / credit
                </p>
                {pack.discountPct > 0 && (
                  <p className="mt-1 text-xs font-semibold text-emerald-600">
                    Save {pack.discountPct}%
                  </p>
                )}
                <p className="mt-3 text-lg font-bold text-brand-red">
                  {formatUZS(pack.total, currency)}
                </p>
                {selected === pack.id && (
                  <Check className="absolute bottom-4 right-4 h-5 w-5 text-brand-red" />
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end border-t border-border px-5 py-4">
          <Button
            variant="primary"
            disabled={!selected}
            loading={checkingOut}
            onClick={handleCheckout}
          >
            <ExternalLink className="h-4 w-4" />
            Checkout securely
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Transaction ledger">
        {loading ? (
          <LoadingRow />
        ) : !data?.ledger.length ? (
          <EmptyState message="No credit transactions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Note</th>
                  <th className="px-5 py-3 text-right font-medium">Change</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-muted">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={t.type} />
                    </td>
                    <td className="px-5 py-3 text-muted">{t.reference ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{t.note ?? "—"}</td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-bold",
                        t.delta >= 0 ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {t.delta > 0 ? `+${t.delta}` : t.delta}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-navy">
                      {t.balanceAfter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PortalPage>
  );
}
