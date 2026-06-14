"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useApiQuery } from "@/hooks/use-api-query";

export function createDataContext<T>(name: string) {
  const Context = createContext<{
    data: T | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  } | null>(null);

  function Provider({
    fetcher,
    children,
    enabled = true,
  }: {
    fetcher: () => Promise<T>;
    children: ReactNode;
    enabled?: boolean;
  }) {
    const { data, loading, error, refresh } = useApiQuery(fetcher, [], {
      enabled,
    });
    return (
      <Context.Provider value={{ data, loading, error, refresh }}>
        {children}
      </Context.Provider>
    );
  }

  function useData() {
    const ctx = useContext(Context);
    if (!ctx) {
      throw new Error(`${name} must be used within its Provider`);
    }
    return ctx;
  }

  return { Provider, useData, Context };
}
