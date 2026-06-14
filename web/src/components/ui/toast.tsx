"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (
    title: string,
    options?: { description?: string; variant?: ToastVariant },
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: React.ReactNode; ring: string }
> = {
  success: {
    icon: <CheckCircle2 size={18} className="text-emerald-500" />,
    ring: "border-emerald-200",
  },
  info: { icon: <Info size={18} className="text-blue-500" />, ring: "border-blue-200" },
  warning: {
    icon: <TriangleAlert size={18} className="text-amber-500" />,
    ring: "border-amber-200",
  },
  error: { icon: <XCircle size={18} className="text-rose-500" />, ring: "border-rose-200" },
};

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (title, options) => {
      const id = ++counter;
      const item: ToastItem = {
        id,
        title,
        description: options?.description,
        variant: options?.variant ?? "success",
      };
      setToasts((prev) => [...prev, item]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                "animate-fade-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg",
                style.ring,
              )}
            >
              <span className="mt-0.5 shrink-0">{style.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback so components never crash if provider is missing.
    return {
      toast: (title: string) =>
        typeof window !== "undefined" && console.info(`[toast] ${title}`),
    } as ToastContextValue;
  }
  return ctx;
}
