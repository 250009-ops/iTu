/**
 * Earliest order `createdAt` included in admin revenue KPIs / trends.
 *
 * Set `REVENUE_STATS_SINCE` (ISO-8601) to zero the dashboard after payment
 * go-live without deleting historical test orders from the ledger.
 *
 * Example (Asia/Tashkent midnight 2026-08-04):
 *   REVENUE_STATS_SINCE=2026-08-04T00:00:00+05:00
 */
export function resolveRevenueStatsSince(
  raw: string | undefined = process.env.REVENUE_STATS_SINCE,
): Date | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid REVENUE_STATS_SINCE: ${raw}`);
  }
  return parsed;
}

/** Prisma `createdAt` lower bound, or undefined when no cutoff is configured. */
export function revenueCreatedAtGte(
  since: Date | null,
): { gte: Date } | undefined {
  return since ? { gte: since } : undefined;
}

/** Later of two dates (used to clamp a chart window to the go-live cutoff). */
export function laterDate(a: Date, b: Date | null): Date {
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}
