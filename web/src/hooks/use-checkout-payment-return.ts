"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getOrderPaymentStatus } from "@/lib/api/payments";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 20;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Options = {
  /** Called after the order reaches paid status. */
  onPaid?: () => void | Promise<void>;
  /** Query param name for payment outcome (default: payment). */
  paymentParam?: string;
  /** Query param name for order code (default: order). */
  orderParam?: string;
  /** Value that means success (default: success). */
  successValue?: string;
};

/**
 * After Uzum redirects back with ?payment=success&order=ORD-…,
 * poll the API until the webhook/reconcile marks the order paid.
 */
export function useCheckoutPaymentReturn(options: Options = {}) {
  const {
    onPaid,
    paymentParam = "payment",
    orderParam = "order",
    successValue = "success",
  } = options;

  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get(paymentParam);
  const orderCode = searchParams.get(orderParam)?.trim() ?? "";
  const isSuccessReturn =
    paymentStatus === successValue && orderCode.length > 0;

  const [reconciling, setReconciling] = useState(isSuccessReturn);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const startedRef = useRef(false);

  const reconcile = useCallback(async () => {
    if (!orderCode) return false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const status = await getOrderPaymentStatus(orderCode);
        if (status.status === "paid") {
          setPaid(true);
          setReconcileError(null);
          await onPaid?.();
          return true;
        }
      } catch {
        /* retry */
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(POLL_INTERVAL_MS);
      }
    }
    return false;
  }, [orderCode, onPaid]);

  useEffect(() => {
    if (!isSuccessReturn || startedRef.current) return;
    startedRef.current = true;
    setReconciling(true);
    setReconcileError(null);

    void reconcile().then((ok) => {
      setReconciling(false);
      if (!ok) {
        setReconcileError(
          "Payment received — confirming your booking. If this page does not update shortly, refresh or contact support.",
        );
      }
    });
  }, [isSuccessReturn, reconcile]);

  return {
    isSuccessReturn,
    paymentStatus,
    orderCode,
    reconciling,
    reconcileError,
    paid,
    retryReconcile: reconcile,
  };
}
