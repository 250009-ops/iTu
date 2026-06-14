"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAdminSettings, updateAdminSettings } from "@/lib/api/admin";
import { mapAdminSettings } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { SettingsTab } from "@/lib/admin/types";

type Mapped = ReturnType<typeof mapAdminSettings>;
type Drafts = Partial<Record<SettingsTab, Record<string, unknown>>>;

type SettingsValue = Mapped & {
  loading: boolean;
  error: string | null;
  unsavedChanges: number;
  setField: (section: SettingsTab, key: string, value: unknown) => void;
  saveAll: () => Promise<void>;
  saveSection: (section: SettingsTab, settings: object) => Promise<void>;
  discard: () => void;
  refresh: () => Promise<void>;
};

const AdminSettingsContext = createContext<SettingsValue | null>(null);

const emptySettings = mapAdminSettings({});

const SECTION_SOURCE: Record<SettingsTab, keyof Mapped> = {
  general: "generalSettings",
  commission: "commissionSettings",
  exam_timers: "examTimers",
  band_table: "bandTable",
  notifications: "notifications",
  integrations: "integrations",
};

export function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getAdminSettings);
  const [drafts, setDrafts] = useState<Drafts>({});

  const mapped = useMemo(
    () => (data ? mapAdminSettings(data) : emptySettings),
    [data],
  );

  const setField = useCallback(
    (section: SettingsTab, key: string, value: unknown) => {
      setDrafts((prev) => ({
        ...prev,
        [section]: { ...(prev[section] ?? {}), [key]: value },
      }));
    },
    [],
  );

  const unsavedChanges = useMemo(
    () =>
      Object.values(drafts).reduce(
        (sum, section) => sum + Object.keys(section ?? {}).length,
        0,
      ),
    [drafts],
  );

  const saveSection = useCallback(
    async (section: SettingsTab, settings: object) => {
      await updateAdminSettings(section, settings);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[section];
        return next;
      });
      await refresh();
    },
    [refresh],
  );

  const discard = useCallback(() => setDrafts({}), []);

  const saveAll = useCallback(async () => {
    const dirtySections = Object.keys(drafts) as SettingsTab[];
    if (dirtySections.length === 0) return;
    for (const section of dirtySections) {
      const sourceKey = SECTION_SOURCE[section];
      const base = (mapped[sourceKey] ?? {}) as Record<string, unknown>;
      const payload = { ...base, ...(drafts[section] ?? {}) };
      await updateAdminSettings(section, payload);
    }
    setDrafts({});
    await refresh();
  }, [drafts, mapped, refresh]);

  const value = useMemo<SettingsValue>(() => {
    const merged: Mapped = {
      ...mapped,
      generalSettings: {
        ...mapped.generalSettings,
        ...(drafts.general ?? {}),
      } as Mapped["generalSettings"],
      commissionSettings: {
        ...mapped.commissionSettings,
        ...(drafts.commission ?? {}),
      } as Mapped["commissionSettings"],
      examTimers: {
        ...(mapped.examTimers as Record<string, number>),
        ...((drafts.exam_timers ?? {}) as Record<string, number>),
      },
      notifications: {
        ...(mapped.notifications as Record<string, boolean>),
        ...((drafts.notifications ?? {}) as Record<string, boolean>),
      },
      integrations: {
        ...(mapped.integrations as Record<string, boolean>),
        ...((drafts.integrations ?? {}) as Record<string, boolean>),
      },
    };
    return {
      ...merged,
      loading,
      error,
      unsavedChanges,
      setField,
      saveAll,
      saveSection,
      discard,
      refresh,
    };
  }, [
    mapped,
    drafts,
    loading,
    error,
    unsavedChanges,
    setField,
    saveAll,
    saveSection,
    discard,
    refresh,
  ]);

  return (
    <AdminSettingsContext.Provider value={value}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) {
    throw new Error("useAdminSettings requires AdminSettingsProvider");
  }
  return ctx;
}
