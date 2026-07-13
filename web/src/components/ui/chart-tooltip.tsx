"use client";

type TooltipPayload = {
  dataKey: string;
  name: string;
  value: number;
  color: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatValue?: (value: number, dataKey: string) => string;
};

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-lg">
      {label && (
        <p className="mb-1.5 text-[11px] font-medium text-muted">{label}</p>
      )}
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="text-[11px] font-bold text-foreground">
            {formatValue
              ? formatValue(entry.value, entry.dataKey)
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export const CHART_AXIS_TICK = { fontSize: 10, fill: "#94a3b8" };
export const CHART_GRID_STROKE = "#e2e8f0";

export {
  formatCurrencyCompact as formatCurrency,
  formatPrice,
  DEFAULT_CURRENCY,
} from "@/lib/format-price";
