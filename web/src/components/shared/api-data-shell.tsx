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
    const looksLikeNetwork =
      /cannot reach|network|offline|failed to fetch|internet/i.test(error);
    return (
      <div className="p-8">
        <div
          className={`mx-auto max-w-lg rounded-xl border p-6 text-center text-sm ${
            looksLikeNetwork
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-semibold">
            {looksLikeNetwork ? "Connection problem" : "Failed to load data"}
          </p>
          <p className="mt-1">{error}</p>
          {looksLikeNetwork ? (
            <p className="mt-3 text-xs opacity-80">
              Progress already saved stays on the server. Reconnect and try again.
            </p>
          ) : null}
          <button
            type="button"
            className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
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
