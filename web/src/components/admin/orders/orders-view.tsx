"use client";

import { OrdersHeader } from "@/components/admin/orders/orders-header";
import { OrdersSummaryCards } from "@/components/admin/orders/orders-summary-cards";
import { PayoutsTable } from "@/components/admin/orders/payouts-table";
import { RevenueTrendChart } from "@/components/admin/orders/revenue-trend-chart";
import { TransactionLedgerTable } from "@/components/admin/orders/transaction-ledger-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminOrdersProvider,
  useAdminOrders,
} from "@/contexts/admin-orders-context";

function OrdersContent() {
  const { loading, error } = useAdminOrders();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <OrdersHeader />
          <OrdersSummaryCards />
          <RevenueTrendChart />
          <TransactionLedgerTable />
          <div id="payouts">
            <PayoutsTable />
          </div>
        </div>
      </div>
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
