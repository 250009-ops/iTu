"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MockProductCard } from "@/components/student/browse/mock-product-card";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import type { BrowseProduct, SkillId } from "@/lib/api/mappers/student";
import {
  createMockSetCheckout,
  getInstitutionMockShop,
  type InstitutionMockShopOffer,
} from "@/lib/api/institution";
import { PageHeader } from "@/components/institution/ui";
import { INSTITUTION_MOCK_SHOP_PLACEHOLDER } from "@/lib/institution/mock-set-shop-placeholder";

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

  useEffect(() => {
    setLoading(true);
    void getInstitutionMockShop()
      .then((data) => {
        setSets(data.sets);
        setError(null);
      })
      .catch(() => setError("Failed to load mock sets"))
      .finally(() => setLoading(false));
  }, []);

  async function handleBuy(setId: string) {
    setCheckingOutSetId(setId);
    try {
      const res = await createMockSetCheckout(setId);
      window.location.href = res.checkoutUrl;
    } catch (err) {
      toast("Checkout failed", {
        description: getErrorMessage(err, "Could not start checkout."),
        variant: "error",
      });
      setCheckingOutSetId(null);
    }
  }

  const displayOffers =
    sets.length > 0 ? sets : [INSTITUTION_MOCK_SHOP_PLACEHOLDER];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 lg:p-6">
      <PageHeader
        breadcrumb="Institution"
        title="Buy mock sets"
        description="Purchase B2B mock sets for your centre — enroll unlimited students on included section mocks."
        actions={
          <Link href="/institution/mocks">
            <Button variant="secondary" size="sm">
              My mocks
            </Button>
          </Link>
        }
      />

      <ApiDataShell loading={loading} error={error}>
        <div className="grid gap-6">
          {displayOffers.map((offer) => (
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
    </div>
  );
}
