"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Button } from "@/components/ui/button";

export function BrowseView() {
  return (
    <StudentBrowseProvider>
      <BrowseContent />
    </StudentBrowseProvider>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const { offers, loading, error } = useStudentBrowseData();
  const visibleOffers = useMemo(
    () => offers.filter((offer) => !isExcludedPackageTypeTab(offer.tabId)),
    [offers],
  );

  const tabFromUrl = searchParams.get("tab");
  const bookFromUrl = searchParams.get("book") === "1";

  const defaultTabId = useMemo(() => {
    if (tabFromUrl && visibleOffers.some((offer) => offer.tabId === tabFromUrl)) {
      return tabFromUrl;
    }
    const firstAvailable = visibleOffers.find((offer) => offer.product != null);
    return firstAvailable?.tabId ?? visibleOffers[0]?.tabId ?? "";
  }, [visibleOffers, tabFromUrl]);

  const [activeTabId, setActiveTabId] = useState("");
  const [autoOpenBooking, setAutoOpenBooking] = useState(bookFromUrl);

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
  const exhaustedAll =
    visibleOffers.length > 0 &&
    visibleOffers.every((offer) => offer.product == null);

  return (
    <ApiDataShell
      loading={loading}
      error={error}
      empty={!visibleOffers.length}
      emptyMessage={
        exhaustedAll
          ? "You have completed or enrolled in every available mock package. Contact support if you need another attempt."
          : "No mocks are available for you to book right now."
      }
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
            <MockProductCard
              product={activeOffer.product}
              autoOpenBooking={autoOpenBooking}
              onBookingOpened={() => setAutoOpenBooking(false)}
            />
          ) : activeOffer?.activeEnrollment ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-4 text-lg font-bold text-navy">
                You&apos;re booked for {activeOffer.activeEnrollment.packageTitle}
              </p>
              <p className="mt-2 text-sm text-muted">
                {activeOffer.activeEnrollment.enrollmentCode} · Mock day{" "}
                {activeOffer.activeEnrollment.mockDateLabel}
                {activeOffer.activeEnrollment.mockTime
                  ? ` at ${activeOffer.activeEnrollment.mockTime}`
                  : ""}
              </p>
              <p className="mt-3 text-sm text-emerald-900">
                This package won&apos;t appear for purchase again — open Mock Day
                Hub when it&apos;s time to sit the exam.
              </p>
              <Link href="/student/mock-day" className="mt-6 inline-block">
                <Button size="lg" className="bg-navy hover:bg-navy-light">
                  <CalendarDays className="h-4 w-4" />
                  Go to Mock Day Hub
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
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
