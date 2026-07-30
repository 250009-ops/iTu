import { SITE, type MockPackage, fullMockCtaLabel as catalogFullMockCtaLabel } from "@/lib/marketing/data";
import { formatPrice } from "@/lib/format-price";

/** Primary mock booking CTA — prefers live catalog package pricing. */
export function fullMockCtaLabel(
  packagesOrPrice?: MockPackage[] | number,
  currency?: string,
): string {
  if (Array.isArray(packagesOrPrice)) {
    return catalogFullMockCtaLabel(packagesOrPrice);
  }
  if (packagesOrPrice != null && currency) {
    return `Book a Full Mock — from ${formatPrice(packagesOrPrice, currency)}`;
  }
  return `Book a Full Mock — from ${formatPrice(SITE.fullMockPrice, SITE.currency)}`;
}
