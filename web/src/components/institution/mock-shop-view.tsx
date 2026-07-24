"use client";

import Link from "next/link";
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
    skills: product.skills.map((skill) => ({
      ...skill,
      id: skill.id as SkillId,
    })),
  };
}

export function InstitutionMockShopView() {
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
          <Link href="/institution/tests">
            <Button variant="secondary" size="sm">
              Tests
            </Button>
          </Link>
        }
      />

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
