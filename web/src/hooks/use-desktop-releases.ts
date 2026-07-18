"use client";

import { useEffect, useState } from "react";
import {
  detectDesktopPlatform,
  platformLabel,
  type DesktopPlatform,
} from "@/lib/desktop/detect-platform";
import {
  getAllDesktopReleases,
  type DesktopReleasesAll,
} from "@/lib/api/releases";

export function useDesktopReleases() {
  const [releases, setReleases] = useState<DesktopReleasesAll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const platform = detectDesktopPlatform();

  useEffect(() => {
    let active = true;
    void getAllDesktopReleases()
      .then((data) => {
        if (active) setReleases(data);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load releases");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const primary = releases?.platforms[platform];
  const hasDownload = Boolean(primary?.url);

  return {
    releases,
    loading,
    error,
    platform,
    platformLabel: platformLabel(platform),
    primaryUrl: primary?.url ?? null,
    version: releases?.version ?? null,
    hasDownload,
  };
}

export const DESKTOP_PLATFORMS: DesktopPlatform[] = ["windows", "macos", "linux"];
