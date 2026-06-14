"use client";

import type { ReactNode } from "react";

type ApiDataShellProps = {
  loading: boolean;
  error: string | null;
  children?: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
};

export function ApiDataShell({
  loading,
  error,
  children,
  empty,
  emptyMessage = "No data available",
}: ApiDataShellProps) {
  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Failed to load data</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="p-8 text-center text-sm text-muted">{emptyMessage}</div>
    );
  }

  return <>{children}</>;
}
