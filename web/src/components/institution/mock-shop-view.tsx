"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MockProductCard } from "@/components/student/browse/mock-product-card";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import type { BrowseProduct, SkillId } from "@/lib/api/mappers/student";
import {
  createMockSetCheckout,
  getInstitutionMockShop,
  type InstitutionMockShopOffer,
} from "@/lib/api/institution";
import { useCheckoutPaymentReturn } from "@/hooks/use-checkout-payment-return";
import { buildInstitutionMockShopPlaceholder } from "@/lib/institution/mock-set-placeholders";
import { PageHeader } from "@/components/institution/ui";

function mapShopProduct(
  product: InstitutionMockShopOffer["product"],
): BrowseProduct {
  const skillIds = product.skills.map(
    (skill) => skill.id as BrowseProduct["skillIds"][number],
  );
  return {
    ...product,
    rating: product.rating ?? 0,
    skillIds,
    needsWriting: skillIds.includes("writing"),
    needsSpeaking: skillIds.includes("speaking"),
    pricingMode: "fixed" as const,
    fromPrice: null,
    priceDependsOnExaminers: false,
    skills: product.skills.map((skill) => ({
      ...skill,
      id: skill.id as SkillId,
    })),
  };
}

export function InstitutionMockShopView() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<InstitutionMockShopOffer[]>([]);
  const [checkingOutSetId, setCheckingOutSetId] = useState<string | null>(null);

  const loadShop = useCallback(() => {
    setLoading(true);
    return getInstitutionMockShop()
      .then((data) => {
        setSets(data.sets);
        setError(null);
      })
      .catch(() => setError("Failed to load test sets"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  const { reconciling, reconcileError, retryReconcile } =
    useCheckoutPaymentReturn({
      onPaid: async () => {
        toast("Payment confirmed", {
          description: "Opening your Purchased set…",
          variant: "success",
        });
        router.replace("/institution/tests/purchased");
      },
    });

  const displaySets = useMemo(
    () => (sets.length > 0 ? sets : [buildInstitutionMockShopPlaceholder()]),
    [sets],
  );

  async function handleBuy(setId: string) {
    setCheckingOutSetId(setId);
    let navigating = false;
    try {
      const res = await createMockSetCheckout(setId);
      navigating = true;
      window.location.href = res.checkoutUrl;
    } catch (err) {
      toast("Checkout failed", {
        description: getErrorMessage(err, "Could not start checkout."),
        variant: "error",
      });
    } finally {
      if (!navigating) setCheckingOutSetId(null);
    }
  }

  return (
    <PortalPage innerClassName="space-y-8">
      <PageHeader
        breadcrumb="Institution"
        title="Buy test sets"
        description="Purchase B2B test sets for your centre. Included section tests appear under Tests → Purchased set; assemble enrollable mocks on the Mocks page."
        actions={
          <Link href="/institution/tests/purchased">
            <Button variant="secondary" size="sm">
              Purchased set
            </Button>
          </Link>
        }
      />

      {reconciling ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            <span>Confirming your payment…</span>
          </div>
        </div>
      ) : null}
      {reconcileError && !reconciling ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{reconcileError}</span>
            <button
              type="button"
              onClick={() => void retryReconcile()}
              className="font-semibold text-amber-950 underline-offset-2 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <ApiDataShell loading={loading} error={error}>
        <div className="grid gap-6">
          {displaySets.map((offer) => (
            <MockProductCard
              key={offer.setId ?? offer.slug}
              mode="institutionShop"
              product={mapShopProduct(offer.product)}
              buying={checkingOutSetId === offer.setId}
              purchaseDisabled={!offer.canPurchase}
              purchaseDisabledReason={offer.disabledReason}
              onBuyClick={
                offer.canPurchase && offer.setId
                  ? () => void handleBuy(offer.setId!)
                  : undefined
              }
            />
          ))}
        </div>
      </ApiDataShell>
    </PortalPage>
  );
}
