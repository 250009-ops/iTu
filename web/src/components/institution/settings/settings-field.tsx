import type { ReactNode } from "react";

export function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
