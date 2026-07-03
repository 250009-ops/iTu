"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BrowsePageHeader,
  MockProductCard,
} from "@/components/student/browse/mock-product-card";
import { BrowseTypeTabs } from "@/components/student/browse/browse-type-tabs";
import { FaqSection } from "@/components/student/browse/faq-section";
import { TestimonialsSection } from "@/components/student/browse/testimonials-section";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  StudentBrowseProvider,
  useStudentBrowseData,
} from "@/contexts/student-browse-context";
import { isExcludedPackageTypeTab } from "@/lib/package-type-tabs";

export function BrowseView() {
  return (
    <StudentBrowseProvider>
      <BrowseContent />
    </StudentBrowseProvider>
  );
}

function BrowseContent() {
  const { offers, loading, error } = useStudentBrowseData();
  const visibleOffers = useMemo(
    () => offers.filter((offer) => !isExcludedPackageTypeTab(offer.tabId)),
    [offers],
  );

  const defaultTabId = useMemo(() => {
    const firstAvailable = visibleOffers.find((offer) => offer.product != null);
    return firstAvailable?.tabId ?? visibleOffers[0]?.tabId ?? "";
  }, [visibleOffers]);

  const [activeTabId, setActiveTabId] = useState("");

  useEffect(() => {
    if (!visibleOffers.length) return;
    setActiveTabId((current) => {
      if (current && visibleOffers.some((offer) => offer.tabId === current)) {
        return current;
      }
      return defaultTabId;
    });
  }, [visibleOffers, defaultTabId]);

  const activeOffer = visibleOffers.find((offer) => offer.tabId === activeTabId);

  return (
    <ApiDataShell
      loading={loading}
      error={error}
      empty={!visibleOffers.length}
      emptyMessage="No mocks are available for you to book right now. You may have already completed or enrolled in every active package."
    >
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <BrowsePageHeader />
          <BrowseTypeTabs
            tabs={visibleOffers.map((offer) => ({
              tabId: offer.tabId,
              label: offer.label,
              available: offer.product != null,
            }))}
            activeTabId={activeTabId || defaultTabId}
            onTabChange={setActiveTabId}
          />
          {activeOffer?.product ? (
            <MockProductCard product={activeOffer.product} />
          ) : activeOffer ? (
            <div className="rounded-xl border border-dashed border-border bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-navy">
                No {activeOffer.label} mocks available right now
              </p>
              <p className="mt-2 text-sm text-muted">
                You may have already completed or enrolled in every{" "}
                {activeOffer.label.toLowerCase()} package. Try another mock
                type above.
              </p>
            </div>
          ) : null}
          <TestimonialsSection />
          <FaqSection />
        </div>
      </div>
    </ApiDataShell>
  );
}
