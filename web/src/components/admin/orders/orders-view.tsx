"use client";

import { useEffect } from "react";
import { OrdersHeader } from "@/components/admin/orders/orders-header";
import { OrdersSummaryCards } from "@/components/admin/orders/orders-summary-cards";
import { PayoutsTable } from "@/components/admin/orders/payouts-table";
import { RevenueTrendChart } from "@/components/admin/orders/revenue-trend-chart";
import { TransactionLedgerTable } from "@/components/admin/orders/transaction-ledger-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminOrdersProvider,
  useAdminOrders,
} from "@/contexts/admin-orders-context";

function scrollToHashTarget(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function OrdersContent() {
  const { loading, error, payoutsLoading } = useAdminOrders();

  useEffect(() => {
    if (loading || payoutsLoading) return;
    const hash = window.location.hash;
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToHashTarget(hash), 80);
    return () => window.clearTimeout(timer);
  }, [loading, payoutsLoading]);

  useEffect(() => {
    function onHashChange() {
      scrollToHashTarget(window.location.hash);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <OrdersHeader />
          <OrdersSummaryCards />
          <RevenueTrendChart />
          <TransactionLedgerTable />
          <div id="payouts">
            <PayoutsTable />
          </div>
      </PortalPage>
    </ApiDataShell>
  );
}

export function OrdersView() {
  return (
    <AdminOrdersProvider>
      <OrdersContent />
    </AdminOrdersProvider>
  );
}
