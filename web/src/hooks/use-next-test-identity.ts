"use client";

import { useEffect, useState } from "react";
import {
  fetchNextTestIdentity,
  placeholderTestCode,
  placeholderTestTitle,
} from "@/lib/admin/content-templates";
import type { ContentModule } from "@/lib/admin/types";

export function useNextTestIdentity(module: ContentModule, enabled: boolean) {
  const [code, setCode] = useState(() => placeholderTestCode(module));
  const [title, setTitle] = useState(() => placeholderTestTitle(module));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    setLoading(true);
    void fetchNextTestIdentity(module)
      .then((identity) => {
        if (!active) return;
        setCode(identity.code);
        setTitle(identity.title);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, module]);

  return { code, title, setCode, setTitle, loadingIdentity: loading };
}
