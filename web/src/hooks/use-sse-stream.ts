"use client";

import { useEffect, useRef } from "react";
import { isOfflineDemoToken } from "@/lib/auth/demo-auth";
import { getAccessToken } from "@/lib/auth/session";
import { API_BASE_URL } from "@/lib/api/config";

type UseSseStreamOptions = {
  enabled?: boolean;
  onMessage: (data: unknown) => void;
  onError?: () => void;
};

/**
 * Authenticated SSE subscription. Passes JWT via access_token query param
 * because EventSource cannot set Authorization headers.
 */
export function useSseStream(path: string | null, options: UseSseStreamOptions) {
  const { enabled = true, onMessage, onError } = options;
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || !path) return;

    const token = getAccessToken();
    if (!token || isOfflineDemoToken(token)) return;

    const url = `${API_BASE_URL}${path}?access_token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        if (
          typeof data === "object" &&
          data !== null &&
          (data as { type?: string }).type === "heartbeat"
        ) {
          return;
        }
        onMessageRef.current(data);
      } catch {
        // ignore malformed payloads
      }
    };

    source.onerror = () => {
      onErrorRef.current?.();
      source.close();
    };

    return () => source.close();
  }, [enabled, path]);
}
