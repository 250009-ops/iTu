"use client";

import { Select } from "@/components/ui/select";

export type PackageTestOption = {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  source?: "centre" | "purchased";
  isPackaged?: boolean;
  assignedMockId?: string | null;
  assignedMockLabel?: string | null;
};

function isLinkableForPackage(status: string) {
  return status.toLowerCase().replace(/-/g, "_") === "published";
}

export function PackageTestSelect({
  label,
  type,
  value,
  options,
  currentPackageId,
  disabled = false,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  options: PackageTestOption[];
  currentPackageId?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const reusable = type === "SPEAKING";
  const filtered = options.filter((o) => o.type === type);
  const selectable = filtered.filter((o) => {
    if (o.id === value) return true;
    if (!isLinkableForPackage(o.status)) return false;
    if (reusable) return true;
    if (!o.isPackaged) return true;
    return o.assignedMockId === currentPackageId;
  });
  const selected = filtered.find((o) => o.id === value);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-navy">{label}</label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full"
        disabled={disabled}
      >
        <option value="">Select a published test…</option>
        {selectable.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code} · {o.title}
            {o.source === "purchased" ? " (purchased)" : ""}
            {o.isPackaged && o.assignedMockId !== currentPackageId
              ? reusable
                ? " (shared)"
                : " (in use)"
              : ""}
          </option>
        ))}
      </Select>
      {selected && (
        <p className="text-xs text-muted">
          {selected.code} · {selected.title}
          {selected.source === "purchased" ? " · from purchased set" : " · centre test"}
          {selected.assignedMockLabel
            ? ` · ${selected.assignedMockLabel}`
            : ""}
        </p>
      )}
    </div>
  );
}
