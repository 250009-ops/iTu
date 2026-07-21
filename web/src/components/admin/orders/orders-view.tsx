"use client";

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

function OrdersContent() {
  const { loading, error } = useAdminOrders();

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
