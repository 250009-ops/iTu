"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { isOfflineDemoToken } from "@/lib/auth/demo-auth";

import { getAccessToken, subscribeSession } from "@/lib/auth/session";

import { getErrorMessage } from "@/lib/api/errors";

import { useHasMounted } from "@/hooks/use-has-mounted";



type UseApiQueryOptions = {

  enabled?: boolean;

  requireAuth?: boolean;

};



export function useApiQuery<T>(

  fetcher: () => Promise<T>,

  deps: unknown[] = [],

  options: UseApiQueryOptions = {},

) {

  const { enabled = true, requireAuth = true } = options;

  const mounted = useHasMounted();

  const [token, setToken] = useState<string | null>(null);



  useEffect(() => {

    setToken(getAccessToken());

    return subscribeSession(() => setToken(getAccessToken()));

  }, []);



  const authReady =

    !requireAuth || (token != null && !isOfflineDemoToken(token));

  const canFetch = mounted && enabled && authReady;



  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!canFetch) return;

    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, "Request failed"));
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [canFetch]);



  useEffect(() => {

    if (!mounted) return;



    if (!canFetch) {

      setLoading(enabled && requireAuth && !authReady);

      setError(null);

      if (!enabled) setData(null);

      return;

    }



    void refresh();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [mounted, canFetch, refresh, enabled, ...deps]);



  return { data, loading, error, refresh };

}


