"use client";

import { Download, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAdminOrders } from "@/contexts/admin-orders-context";
import { orderStatusFilterOptions } from "@/lib/admin/constants";
import type { OrderStatus } from "@/lib/admin/types";
import { exportOrdersCsv } from "@/lib/admin/export";
import { cn } from "@/lib/utils";

export function OrdersHeader() {
  const { toast } = useToast();
  const {
    filteredOrders,
    filtersActive,
    query,
    statusFilter,
    setQuery,
    setStatusFilter,
    clearFilters,
    focusLedgerFilters,
  } = useAdminOrders();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted">Admin &gt; Orders</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Orders &amp; Payments
          </h1>
          <p className="mt-1 text-sm text-muted">
            Financial records — payment transactions, invoices, and refund
            management.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={cn(filtersActive && "border-navy/30 bg-navy/5")}
            onClick={focusLedgerFilters}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {filtersActive ? (
              <span className="ml-1 rounded-full bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
                On
              </span>
            ) : null}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              exportOrdersCsv(filteredOrders);
              toast("Export ready", {
                description: `${filteredOrders.length} order${filteredOrders.length !== 1 ? "s" : ""} downloaded${filtersActive ? " (filtered)" : ""}.`,
              });
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div
        id="orders-filter-bar"
        className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            placeholder="Filter by order, student, enrollment, or package…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            aria-label="Filter orders"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | OrderStatus)
          }
          className="h-9 w-full sm:w-44"
          aria-label="Filter by status"
        >
          {orderStatusFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {filtersActive ? (
          <Button
            variant="secondary"
            size="sm"
            className="h-9 shrink-0"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
