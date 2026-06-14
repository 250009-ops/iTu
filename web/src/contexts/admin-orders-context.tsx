"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getAdminOrders,
  getAdminPayouts,
  refundOrder,
  updatePayoutStatus,
  type AdminPayout,
} from "@/lib/api/admin";
import { mapOrders } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Order } from "@/lib/admin/types";

type OrdersValue = {
  loading: boolean;
  error: string | null;
  orders: Order[];
  payouts: AdminPayout[];
  payoutsLoading: boolean;
  summary: ReturnType<typeof mapOrders>["summary"];
  monthlyOrderTrend: ReturnType<typeof mapOrders>["monthlyOrderTrend"];
  issueRefund: (
    orderId: string,
    payload?: { amount?: number; reason?: string },
  ) => Promise<void>;
  markPayoutPaid: (payoutId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminOrdersContext = createContext<OrdersValue | null>(null);

export function AdminOrdersProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh: refreshOrders } = useApiQuery(getAdminOrders);
  const {
    data: payoutsData,
    loading: payoutsLoading,
    refresh: refreshPayouts,
  } = useApiQuery(getAdminPayouts);

  const refresh = useCallback(async () => {
    await Promise.all([refreshOrders(), refreshPayouts()]);
  }, [refreshOrders, refreshPayouts]);

  const issueRefund = useCallback(
    async (orderId: string, payload?: { amount?: number; reason?: string }) => {
      await refundOrder(orderId, payload);
      await refreshOrders();
    },
    [refreshOrders],
  );

  const markPayoutPaid = useCallback(
    async (payoutId: string) => {
      await updatePayoutStatus(payoutId, "PAID");
      await refreshPayouts();
    },
    [refreshPayouts],
  );

  const value = useMemo<OrdersValue>(() => {
    const mapped = data ? mapOrders(data) : null;
    return {
      loading,
      error,
      orders: mapped?.orders ?? [],
      payouts: payoutsData ?? [],
      payoutsLoading,
      summary: mapped?.summary ?? {
        revenueCollected: 0,
        revenueTrend: "—",
        paidOrders: 0,
        paidTotal: 0,
        refundsIssued: 0,
        refundTotal: 0,
        failedPayments: 0,
      },
      monthlyOrderTrend: mapped?.monthlyOrderTrend ?? [],
      issueRefund,
      markPayoutPaid,
      refresh,
    };
  }, [
    data,
    loading,
    error,
    payoutsData,
    payoutsLoading,
    issueRefund,
    markPayoutPaid,
    refresh,
  ]);

  return (
    <AdminOrdersContext.Provider value={value}>
      {children}
    </AdminOrdersContext.Provider>
  );
}

export function useAdminOrders() {
  const ctx = useContext(AdminOrdersContext);
  if (!ctx) {
    throw new Error("useAdminOrders requires AdminOrdersProvider");
  }
  return ctx;
}
