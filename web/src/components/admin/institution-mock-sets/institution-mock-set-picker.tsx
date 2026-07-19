"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  MockSetContentOptionPackage,
  MockSetContentOptionTest,
} from "@/lib/api/admin-institution-mock-sets";
import {
  isPackageSelectable,
  isTestSelectable,
  type MockSetPickerTab,
} from "@/lib/admin/institution-mock-set-content";
import { cn } from "@/lib/utils";

const PICKER_TABS: { id: MockSetPickerTab; label: string }[] = [
  { id: "listening", label: "Listening" },
  { id: "reading", label: "Reading" },
  { id: "writing", label: "Writing" },
];

type Props = {
  packages: {
    listening: MockSetContentOptionPackage[];
    reading: MockSetContentOptionPackage[];
    writing: MockSetContentOptionPackage[];
  };
  tests: {
    listening: MockSetContentOptionTest[];
    reading: MockSetContentOptionTest[];
    writing: MockSetContentOptionTest[];
  };
  selectedPackageIds: Set<string>;
  selectedTestIds: Record<MockSetPickerTab, Set<string>>;
  onChangePackages: (ids: Set<string>) => void;
  onChangeTests: (tab: MockSetPickerTab, ids: Set<string>) => void;
  currentSetId?: string;
  disabled?: boolean;
};

export function InstitutionMockSetPicker({
  packages,
  tests,
  selectedPackageIds,
  selectedTestIds,
  onChangePackages,
  onChangeTests,
  currentSetId,
  disabled = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<MockSetPickerTab>("listening");
  const [search, setSearch] = useState("");

  const tabPackages = packages[activeTab];
  const tabTests = tests[activeTab];
  const tabSelectedTests = selectedTestIds[activeTab];

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabPackages;
    return tabPackages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.mockLabel.toLowerCase().includes(q),
    );
  }, [tabPackages, search]);

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabTests;
    return tabTests.filter(
      (t) =>
        t.code.toLowerCase().includes(q) || t.title.toLowerCase().includes(q),
    );
  }, [tabTests, search]);

  function togglePackage(id: string) {
    if (disabled) return;
    const next = new Set(selectedPackageIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChangePackages(next);
  }

  function toggleTest(id: string) {
    if (disabled) return;
    const next = new Set(tabSelectedTests);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChangeTests(activeTab, next);
  }

  function selectAllAvailable() {
    if (disabled) return;
    const nextPackages = new Set(selectedPackageIds);
    for (const pkg of tabPackages) {
      if (isPackageSelectable(pkg, selectedPackageIds, currentSetId)) {
        nextPackages.add(pkg.id);
      }
    }
    onChangePackages(nextPackages);

    const nextTests = new Set(tabSelectedTests);
    for (const test of tabTests) {
      if (isTestSelectable(test, tabSelectedTests, currentSetId)) {
        nextTests.add(test.id);
      }
    }
    onChangeTests(activeTab, nextTests);
  }

  function clearTab() {
    if (disabled) return;
    const nextPackages = new Set(selectedPackageIds);
    for (const pkg of tabPackages) nextPackages.delete(pkg.id);
    onChangePackages(nextPackages);
    onChangeTests(activeTab, new Set());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PICKER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSearch("");
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              activeTab === tab.id
                ? "bg-navy text-white"
                : "bg-slate-100 text-muted hover:bg-slate-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeTab} packages or tests…`}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={selectAllAvailable}
          disabled={disabled}
          className="text-xs font-medium text-navy hover:underline disabled:opacity-50"
        >
          Select all available
        </button>
        <button
          type="button"
          onClick={clearTab}
          disabled={disabled}
          className="text-xs font-medium text-muted hover:underline disabled:opacity-50"
        >
          Clear {activeTab}
        </button>
      </div>

      <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-slate-200 p-3">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Section packages
          </p>
          {filteredPackages.length === 0 ? (
            <p className="text-sm text-muted">No packages match.</p>
          ) : (
            <ul className="space-y-1">
              {filteredPackages.map((pkg) => {
                const selectable = isPackageSelectable(
                  pkg,
                  selectedPackageIds,
                  currentSetId,
                );
                const checked = selectedPackageIds.has(pkg.id);
                return (
                  <li key={pkg.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                        !selectable && "cursor-not-allowed opacity-50",
                        checked && "bg-sky-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled || !selectable}
                        onChange={() => togglePackage(pkg.id)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{pkg.mockLabel}</span>
                        <span className="text-muted"> — {pkg.title}</span>
                        {pkg.isAssigned && pkg.assignedSetTitle && (
                          <span className="mt-0.5 block text-xs text-amber-700">
                            In set: {pkg.assignedSetTitle}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Published tests (auto-create package)
          </p>
          {filteredTests.length === 0 ? (
            <p className="text-sm text-muted">No tests match.</p>
          ) : (
            <ul className="space-y-1">
              {filteredTests.map((test) => {
                const selectable = isTestSelectable(
                  test,
                  tabSelectedTests,
                  currentSetId,
                );
                const checked = tabSelectedTests.has(test.id);
                return (
                  <li key={test.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                        !selectable && "cursor-not-allowed opacity-50",
                        checked && "bg-sky-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled || !selectable}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{test.code}</span>
                        <span className="text-muted"> — {test.title}</span>
                        {test.isAssigned && test.assignedSetTitle && (
                          <span className="mt-0.5 block text-xs text-amber-700">
                            In set: {test.assignedSetTitle}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
