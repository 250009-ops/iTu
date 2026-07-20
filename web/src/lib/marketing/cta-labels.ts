import { SITE } from "@/lib/marketing/data";
import { formatPrice } from "@/lib/format-price";

/** Primary mock booking CTA — uses catalog price when available. */
export function fullMockCtaLabel(price?: number, currency?: string): string {
  if (price != null && currency) {
    return `Book a Full Mock — ${formatPrice(price, currency)}`;
  }
  return `Book a Full Mock — ${formatPrice(SITE.fullMockPrice, SITE.currency)}`;
}
