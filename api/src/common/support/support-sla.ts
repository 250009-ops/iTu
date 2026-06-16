import { TicketPriority, TicketStatus } from '@prisma/client';

/** SLA response window in hours by ticket priority. */
export const SLA_HOURS: Record<TicketPriority, number> = {
  URGENT: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

const ACTIVE_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS'];

export function isActiveTicketStatus(status: TicketStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function computeSlaMetrics(
  priority: TicketPriority,
  createdAt: Date,
  status: TicketStatus,
  now = new Date(),
) {
  if (!isActiveTicketStatus(status)) {
    return { progress: 100, state: 'ON_TRACK' as const };
  }

  const slaHours = SLA_HOURS[priority];
  const elapsedMs = now.getTime() - createdAt.getTime();
  const slaMs = slaHours * 60 * 60 * 1000;
  const progress = Math.min(100, Math.round((elapsedMs / slaMs) * 100));

  if (progress >= 100) {
    return { progress: 100, state: 'BREACHED' as const };
  }
  if (progress >= 75) {
    return { progress, state: 'AT_RISK' as const };
  }
  return { progress, state: 'ON_TRACK' as const };
}
