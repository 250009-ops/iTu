"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, RotateCcw, Search, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { orderStatusFilterOptions } from "@/lib/admin/constants";
import type { Order, OrderStatus, PaymentMethod } from "@/lib/admin/types";
import { useAdminOrders } from "@/contexts/admin-orders-context";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

const statusStyles: Record<
  OrderStatus,
  { label: string; dot: string; pill: string }
> = {
  paid: {
    label: "Paid",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  refunded: {
    label: "Refunded",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600",
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700",
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
};

function PaymentMethodCell({
  method,
  label,
}: {
  method: PaymentMethod;
  label: string;
}) {
  const Icon =
    method === "apple_pay" ? Smartphone : CreditCard;

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
      <span className="text-sm text-navy">{label}</span>
    </div>
  );
}

export function TransactionLedgerTable() {
  const { orders, issueRefund } = useAdminOrders();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function confirmRefund() {
    if (!refunding) return;
    const target = refunding;
    setBusy(true);
    try {
      await issueRefund(target.id, { reason: "Admin-initiated refund" });
      toast(`${target.orderId} refunded`, {
        description: `$${target.amount.toFixed(2)} returned to ${target.studentName}.`,
        variant: "success",
      });
      setRefunding(null);
    } catch (err) {
      toast("Refund failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesQuery =
        !query.trim() ||
        order.studentName.toLowerCase().includes(query.toLowerCase()) ||
        order.orderId.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [orders, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold text-navy">Transaction Ledger</h2>
        <p className="mt-0.5 text-sm text-muted">
          All payment records linked to student enrollments.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search order or student…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | OrderStatus)
            }
            className="h-9 w-full sm:w-40"
          >
            {orderStatusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Order ID</th>
              <th className="px-5 py-3 sm:px-6">Student</th>
              <th className="px-5 py-3 sm:px-6">Enrollment Ref</th>
              <th className="px-5 py-3 sm:px-6">Package</th>
              <th className="px-5 py-3 sm:px-6">Payment Method</th>
              <th className="px-5 py-3 sm:px-6">Date</th>
              <th className="px-5 py-3 sm:px-6">Amount</th>
              <th className="px-5 py-3 sm:px-6">Status</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-8 text-center text-muted sm:px-6"
                >
                  No orders found.
                </td>
              </tr>
            ) : (
              paged.map((order) => {
                const status = statusStyles[order.status];
                return (
                  <tr
                    key={order.id}
                    onClick={() =>
                      toast(`${order.orderId} · ${order.studentName}`, {
                        description: `${order.package} · $${order.amount.toFixed(2)} · ${status.label}`,
                        variant: "info",
                      })
                    }
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 font-semibold text-navy sm:px-6">
                      {order.orderId}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                          {order.initials}
                        </div>
                        <span className="font-medium text-navy">
                          {order.studentName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push("/admin/enrollments");
                        }}
                        className="font-medium text-sky-600 hover:underline"
                      >
                        {order.enrollmentRef}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-navy sm:px-6">
                      {order.package}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <PaymentMethodCell
                        method={order.paymentMethod}
                        label={order.paymentLabel}
                      />
                    </td>
                    <td className="px-5 py-4 text-navy sm:px-6">
                      {order.date}
                    </td>
                    <td className="px-5 py-4 font-bold text-navy sm:px-6">
                      ${order.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          status.pill,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", status.dot)}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex justify-end">
                        {order.status === "paid" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 border-rose-200 text-brand-red hover:bg-rose-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRefunding(order);
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Refund
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-muted">
          Showing {paged.length} of {filtered.length} transaction
          {filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                p === safePage
                  ? "bg-navy text-white"
                  : "border border-border text-muted hover:bg-slate-50",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={refunding !== null}
        title={refunding ? `Refund ${refunding.orderId}?` : ""}
        message={
          refunding
            ? `Issue a full refund of $${refunding.amount.toFixed(2)} to ${refunding.studentName}? This cannot be undone.`
            : ""
        }
        confirmLabel={busy ? "Processing…" : "Issue refund"}
        tone="danger"
        onConfirm={confirmRefund}
        onCancel={() => setRefunding(null)}
      />
    </div>
  );
}
