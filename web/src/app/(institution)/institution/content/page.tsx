"use client";

import { Suspense, useState } from "react";
import { ContentStudioInner } from "@/components/admin/content/content-studio-view";
import { InstitutionPackagesPanel } from "@/components/institution/content/institution-packages-panel";
import { InstitutionContentProvider } from "@/contexts/institution-content-context";
import { cn } from "@/lib/utils";

type Tab = "tests" | "packages";

function InstitutionContentPageInner() {
  const [tab, setTab] = useState<Tab>("tests");

  return (
    <div className="min-h-0">
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 pt-4 lg:px-6 xl:px-8">
          {(
            [
              { id: "tests" as const, label: "Tests" },
              { id: "packages" as const, label: "Private packages" },
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

      {tab === "tests" ? (
        <Suspense fallback={null}>
          <ContentStudioInner />
        </Suspense>
      ) : (
        <InstitutionPackagesPanel />
      )}
    </div>
  );
}

export default function InstitutionContentPage() {
  return (
    <InstitutionContentProvider>
      <InstitutionContentPageInner />
    </InstitutionContentProvider>
  );
}
