"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
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
import type { Order, OrderStatus } from "@/lib/admin/types";

type OrdersValue = {
  loading: boolean;
  error: string | null;
  orders: Order[];
  filteredOrders: Order[];
  payouts: AdminPayout[];
  payoutsLoading: boolean;
  summary: ReturnType<typeof mapOrders>["summary"];
  monthlyOrderTrend: ReturnType<typeof mapOrders>["monthlyOrderTrend"];
  /** Shared ledger filters (header + table). */
  query: string;
  statusFilter: "all" | OrderStatus;
  setQuery: (value: string) => void;
  setStatusFilter: (value: "all" | OrderStatus) => void;
  clearFilters: () => void;
  filtersActive: boolean;
  ledgerSearchRef: RefObject<HTMLInputElement | null>;
  focusLedgerFilters: () => void;
  issueRefund: (
    orderId: string,
    payload?: { amount?: number; reason?: string },
  ) => Promise<void>;
  markPayoutPaid: (payoutId: string) => Promise<void>;
  updatePayout: (
    payoutId: string,
    status: "PENDING" | "PROCESSING" | "PAID" | "FAILED",
  ) => Promise<void>;
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

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const ledgerSearchRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    await Promise.all([refreshOrders(), refreshPayouts()]);
  }, [refreshOrders, refreshPayouts]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setStatusFilter("all");
  }, []);

  const focusLedgerFilters = useCallback(() => {
    const el = document.getElementById("transaction-ledger");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      ledgerSearchRef.current?.focus();
    }, 280);
  }, []);

  const issueRefund = useCallback(
    async (orderId: string, payload?: { amount?: number; reason?: string }) => {
      await refundOrder(orderId, payload);
      // Refresh orders (KPIs + ledger) and payouts so the page stays consistent.
      await refresh();
    },
    [refresh],
  );

  const markPayoutPaid = useCallback(
    async (payoutId: string) => {
      await updatePayoutStatus(payoutId, "PAID");
      await refreshPayouts();
    },
    [refreshPayouts],
  );

  const updatePayout = useCallback(
    async (
      payoutId: string,
      status: "PENDING" | "PROCESSING" | "PAID" | "FAILED",
    ) => {
      await updatePayoutStatus(payoutId, status);
      await refreshPayouts();
    },
    [refreshPayouts],
  );

  const value = useMemo<OrdersValue>(() => {
    const mapped = data ? mapOrders(data) : null;
    const orders = mapped?.orders ?? [];
    const q = query.trim().toLowerCase();
    const filteredOrders = orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesQuery =
        !q ||
        order.studentName.toLowerCase().includes(q) ||
        order.orderId.toLowerCase().includes(q) ||
        order.enrollmentRef.toLowerCase().includes(q) ||
        order.package.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    return {
      loading,
      error,
      orders,
      filteredOrders,
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
        pendingPayments: 0,
      },
      monthlyOrderTrend: mapped?.monthlyOrderTrend ?? [],
      query,
      statusFilter,
      setQuery,
      setStatusFilter,
      clearFilters,
      filtersActive: Boolean(q) || statusFilter !== "all",
      ledgerSearchRef,
      focusLedgerFilters,
      issueRefund,
      markPayoutPaid,
      updatePayout,
      refresh,
    };
  }, [
    data,
    loading,
    error,
    payoutsData,
    payoutsLoading,
    query,
    statusFilter,
    clearFilters,
    focusLedgerFilters,
    issueRefund,
    markPayoutPaid,
    updatePayout,
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
