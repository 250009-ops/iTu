import { CATALOG_CURRENCY } from './catalog-pricing';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

/** Format money for notifications / admin copy (defaults to UZS so'm). */
export function formatMoney(
  amount: number,
  currency: string = CATALOG_CURRENCY,
): string {
  const code = (currency || CATALOG_CURRENCY).toUpperCase();
  const formatted = NUMBER_FORMAT.format(Math.abs(amount));
  if (code === 'UZS' || code === 'USD') {
    // Platform is soum-only; legacy USD labels still render as so'm.
    return `${formatted} so'm`;
  }
  return `${formatted} ${code}`;
}
