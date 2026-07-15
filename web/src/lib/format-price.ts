/** Platform catalog / commerce currency (Uzbek soum). */
export const DEFAULT_CURRENCY = "UZS" as const;

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const NUMBER_FORMAT_DECIMAL = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function normalizeCurrency(currency?: string | null): string {
  const code = (currency ?? DEFAULT_CURRENCY).toUpperCase().trim();
  // Legacy USD rows are treated as UZS — the live catalog is soum-only.
  if (!code || code === "USD") return DEFAULT_CURRENCY;
  return code;
}

/** Format catalog/order/payout amounts for display (defaults to UZS so'm). */
export function formatPrice(
  price: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const code = normalizeCurrency(currency);
  const abs = Math.abs(price);
  const formatted =
    Number.isInteger(abs) || code === "UZS"
      ? NUMBER_FORMAT.format(abs)
      : NUMBER_FORMAT_DECIMAL.format(abs);

  if (code === "UZS") {
    return `${formatted} so'm`;
  }
  if (code === "EUR") return `€${formatted}`;
  if (code === "GBP") return `£${formatted}`;
  return `${formatted} ${code}`;
}

/** Compact axis/tooltip labels for charts. */
export function formatCurrencyCompact(
  value: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const code = normalizeCurrency(currency);
  const abs = Math.abs(value);
  let compact: string;
  if (abs >= 1_000_000) {
    compact = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  } else if (abs >= 1_000) {
    compact = `${Math.round(abs / 1_000)}k`;
  } else {
    compact = NUMBER_FORMAT.format(abs);
  }
  if (code === "UZS") return `${compact} so'm`;
  return `${compact} ${code}`;
}

/** Y-axis tick labels — numbers only; put the currency unit in the chart legend. */
export function formatChartAxisNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }
  if (abs >= 1_000) {
    return `${Math.round(abs / 1_000)}k`;
  }
  return NUMBER_FORMAT.format(abs);
}
