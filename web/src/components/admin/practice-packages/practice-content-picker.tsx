"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  PracticeContentOptionPrompt,
  PracticeContentOptionUnit,
} from "@/lib/api/admin";
import {
  isPromptSelectable,
  isUnitSelectable,
  PICKER_UNIT_SECTIONS,
  type PracticePickerTab,
} from "@/lib/admin/practice-package-content";
import { cn } from "@/lib/utils";

const PICKER_TABS: { id: PracticePickerTab; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing", label: "Writing (AI)" },
];

type Props = {
  units: PracticeContentOptionUnit[];
  prompts: PracticeContentOptionPrompt[];
  selectedUnitIds: Set<string>;
  selectedPromptIds: Set<string>;
  onChangeUnits: (ids: Set<string>) => void;
  onChangePrompts: (ids: Set<string>) => void;
  currentPackageId?: string;
  disabled?: boolean;
};

export function PracticeContentPicker({
  units,
  prompts,
  selectedUnitIds,
  selectedPromptIds,
  onChangeUnits,
  onChangePrompts,
  currentPackageId,
  disabled = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<PracticePickerTab>("reading");
  const [search, setSearch] = useState("");

  const tabSections = useMemo(
    () => PICKER_UNIT_SECTIONS.filter((section) => section.tab === activeTab),
    [activeTab],
  );

  const task1Prompts = useMemo(
    () => prompts.filter((p) => p.taskNumber === 1),
    [prompts],
  );
  const task2Prompts = useMemo(
    () => prompts.filter((p) => p.taskNumber === 2),
    [prompts],
  );

  function toggleUnit(id: string) {
    if (disabled) return;
    const next = new Set(selectedUnitIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChangeUnits(next);
  }

  function togglePrompt(id: string) {
    if (disabled) return;
    const next = new Set(selectedPromptIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChangePrompts(next);
  }

  function selectAllUnits(sectionType: string) {
    if (disabled) return;
    const next = new Set(selectedUnitIds);
    for (const unit of units) {
      if (
        unit.type === sectionType &&
        isUnitSelectable(unit, selectedUnitIds, currentPackageId)
      ) {
        next.add(unit.id);
      }
    }
    onChangeUnits(next);
  }

  function clearSectionUnits(sectionType: string) {
    if (disabled) return;
    const next = new Set(selectedUnitIds);
    for (const unit of units) {
      if (unit.type === sectionType) next.delete(unit.id);
    }
    onChangeUnits(next);
  }

  function selectAllPrompts(taskNumber: number) {
    if (disabled) return;
    const next = new Set(selectedPromptIds);
    for (const prompt of prompts) {
      if (
        prompt.taskNumber === taskNumber &&
        isPromptSelectable(prompt, selectedPromptIds, currentPackageId)
      ) {
        next.add(prompt.id);
      }
    }
    onChangePrompts(next);
  }

  function clearPrompts(taskNumber: number) {
    if (disabled) return;
    const next = new Set(selectedPromptIds);
    for (const prompt of prompts) {
      if (prompt.taskNumber === taskNumber) next.delete(prompt.id);
    }
    onChangePrompts(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {PICKER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-navy text-white"
                : "text-muted hover:bg-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or title…"
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {activeTab === "writing" ? (
        <div className="space-y-4">
          <PromptSection
            title="Task 1 prompts"
            prompts={task1Prompts}
            selected={selectedPromptIds}
            search={search}
            currentPackageId={currentPackageId}
            disabled={disabled}
            onToggle={togglePrompt}
            onSelectAll={() => selectAllPrompts(1)}
            onClear={() => clearPrompts(1)}
          />
          <PromptSection
            title="Task 2 prompts"
            prompts={task2Prompts}
            selected={selectedPromptIds}
            search={search}
            currentPackageId={currentPackageId}
            disabled={disabled}
            onToggle={togglePrompt}
            onSelectAll={() => selectAllPrompts(2)}
            onClear={() => clearPrompts(2)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {tabSections.map((section) => (
            <UnitSection
              key={section.id}
              title={section.title}
              units={units.filter((u) => u.type === section.type)}
              selected={selectedUnitIds}
              search={search}
              currentPackageId={currentPackageId}
              disabled={disabled}
              onToggle={toggleUnit}
              onSelectAll={() => selectAllUnits(section.type)}
              onClear={() => clearSectionUnits(section.type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnitSection({
  title,
  units,
  selected,
  search,
  currentPackageId,
  disabled,
  onToggle,
  onSelectAll,
  onClear,
}: {
  title: string;
  units: PracticeContentOptionUnit[];
  selected: Set<string>;
  search: string;
  currentPackageId?: string;
  disabled?: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const needle = search.trim().toLowerCase();
  const filtered = units.filter(
    (u) =>
      !needle ||
      u.code.toLowerCase().includes(needle) ||
      u.title.toLowerCase().includes(needle),
  );
  const selectedCount = units.filter((u) => selected.has(u.id)).length;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          <p className="text-xs text-muted">{selectedCount} selected</p>
        </div>
        {!disabled && (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAll}
              className="font-medium text-sky-700 hover:underline"
            >
              Select all available
            </button>
            <button
              type="button"
              onClick={onClear}
              className="font-medium text-muted hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <ScrollableCheckboxList
        emptyMessage="No published units in this category yet."
        items={filtered.map((unit) => {
          const selectable = isUnitSelectable(unit, selected, currentPackageId);
          return {
            id: unit.id,
            checked: selected.has(unit.id),
            disabled: disabled || !selectable,
            primary: unit.code,
            secondary: unit.title,
            meta: `${unit.questionCount} Q`,
            badge:
              unit.isAssigned && unit.assignedPackageId !== currentPackageId
                ? unit.assignedPackageTitle
                : null,
          };
        })}
        onToggle={onToggle}
      />
    </section>
  );
}

function PromptSection({
  title,
  prompts,
  selected,
  search,
  currentPackageId,
  disabled,
  onToggle,
  onSelectAll,
  onClear,
}: {
  title: string;
  prompts: PracticeContentOptionPrompt[];
  selected: Set<string>;
  search: string;
  currentPackageId?: string;
  disabled?: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const needle = search.trim().toLowerCase();
  const filtered = prompts.filter(
    (p) =>
      !needle ||
      p.code.toLowerCase().includes(needle) ||
      p.title.toLowerCase().includes(needle),
  );
  const selectedCount = prompts.filter((p) => selected.has(p.id)).length;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          <p className="text-xs text-muted">{selectedCount} selected</p>
        </div>
        {!disabled && (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAll}
              className="font-medium text-sky-700 hover:underline"
            >
              Select all available
            </button>
            <button
              type="button"
              onClick={onClear}
              className="font-medium text-muted hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <ScrollableCheckboxList
        emptyMessage="No published prompts in this category yet."
        items={filtered.map((prompt) => {
          const selectable = isPromptSelectable(
            prompt,
            selected,
            currentPackageId,
          );
          return {
            id: prompt.id,
            checked: selected.has(prompt.id),
            disabled: disabled || !selectable,
            primary: prompt.code,
            secondary: prompt.title,
            meta: `Task ${prompt.taskNumber}`,
            badge:
              prompt.isAssigned && prompt.assignedPackageId !== currentPackageId
                ? prompt.assignedPackageTitle
                : null,
          };
        })}
        onToggle={onToggle}
      />
    </section>
  );
}

function ScrollableCheckboxList({
  items,
  emptyMessage,
  onToggle,
}: {
  items: {
    id: string;
    checked: boolean;
    disabled: boolean;
    primary: string;
    secondary: string;
    meta?: string;
    badge: string | null;
  }[];
  emptyMessage: string;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
      {items.map((item) => (
        <label
          key={item.id}
          className={cn(
            "flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-slate-50",
            item.checked && "bg-sky-50",
            item.disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <input
            type="checkbox"
            checked={item.checked}
            disabled={item.disabled}
            onChange={() => onToggle(item.id)}
            className="rounded border-border"
          />
          <span className="font-mono text-xs font-semibold text-navy">
            {item.primary}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted">
            {item.secondary}
          </span>
          {item.meta && (
            <span className="shrink-0 text-xs text-muted">{item.meta}</span>
          )}
          {item.badge && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              {item.badge}
            </span>
          )}
        </label>
      ))}
    </div>
  );
}
