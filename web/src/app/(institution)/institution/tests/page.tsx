"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContentStudioInner } from "@/components/admin/content/content-studio-view";
import { PurchasedTestsPanel } from "@/components/institution/content/purchased-tests-panel";
import { InstitutionContentProvider } from "@/contexts/institution-content-context";
import { cn } from "@/lib/utils";

type Tab = "purchased" | "studio";

function InstitutionTestsPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    tabParam === "studio" ? "studio" : "purchased",
  );

  useEffect(() => {
    if (tabParam === "studio") setTab("studio");
    else if (tabParam === "purchased") setTab("purchased");
  }, [tabParam]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border bg-white">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl gap-1 px-4 pt-4 lg:px-6 xl:px-8">
          {(
            [
              { id: "purchased" as const, label: "Purchased set" },
              { id: "studio" as const, label: "Content Studio" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === item.id
                  ? "bg-slate-50 text-navy"
                  : "text-muted hover:text-navy",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "purchased" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PurchasedTestsPanel />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={null}>
            <ContentStudioInner />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default function InstitutionTestsPage() {
  return (
    <InstitutionContentProvider>
      <Suspense fallback={null}>
        <InstitutionTestsPageInner />
      </Suspense>
    </InstitutionContentProvider>
  );
}
