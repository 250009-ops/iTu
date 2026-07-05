import { apiFetch } from "./client";

export function getPaymentConfig() {
  return apiFetch<{ paymentsEnabled: boolean }>("/payments/config", {
    auth: false,
  }).catch(() => ({ paymentsEnabled: false }));
}

export function getOrderPaymentStatus(orderCode: string) {
  return apiFetch<{
    orderCode: string;
    status: string;
    enrollmentCode: string | null;
    checkoutUrl: string | null;
    checkoutExpiresAt: string | null;
  }>(`/payments/orders/${encodeURIComponent(orderCode)}/status`);
}
