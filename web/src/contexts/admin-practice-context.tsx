"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  archivePracticeUnit,
  createPracticeUnit,
  createWritingPrompt,
  deletePracticeUnit,
  getAdminPracticeUnit,
  getAdminPracticeUnits,
  getAdminWritingPrompt,
  getAdminWritingPrompts,
  publishPracticeUnit,
  publishWritingPrompt,
  suggestPracticeUnitIdentity,
  suggestWritingPromptIdentity,
  updatePracticeUnit,
  updateWritingPrompt,
  type AdminPracticeUnit,
  type AdminWritingPrompt,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import {
  emptyListeningPart as factoryEmptyListeningPart,
  emptyReadingPassage as factoryEmptyReadingPassage,
} from "@/lib/admin/content/factories";

export type PracticeStudioTab = "reading" | "listening" | "writing-ai";

type AdminPracticeContextValue = {
  loading: boolean;
  error: string | null;
  units: AdminPracticeUnit[];
  prompts: AdminWritingPrompt[];
  activeTab: PracticeStudioTab;
  setActiveTab: (tab: PracticeStudioTab) => void;
  selectedUnitId: string | null;
  setSelectedUnitId: (id: string | null) => void;
  selectedPromptId: string | null;
  setSelectedPromptId: (id: string | null) => void;
  refresh: () => Promise<void>;
  createUnit: (payload: {
    type: string;
    title?: string;
    questionType?: string;
    passagePart?: number;
    listeningPart?: number;
    content: object;
    answerKey?: object;
  }) => Promise<string>;
  saveUnit: (
    id: string,
    payload: {
      title?: string;
      questionType?: string;
      content?: object;
      answerKey?: object;
      durationMin?: number;
    },
  ) => Promise<void>;
  publishUnit: (id: string) => Promise<void>;
  archiveUnit: (id: string) => Promise<void>;
  removeUnit: (id: string) => Promise<void>;
  loadUnit: (id: string) => Promise<unknown>;
  createPrompt: (taskNumber: number, instruction: string) => Promise<string>;
  savePrompt: (
    id: string,
    payload: { title?: string; instruction?: string; minWords?: number },
  ) => Promise<void>;
  publishPrompt: (id: string) => Promise<void>;
  loadPrompt: (id: string) => Promise<unknown>;
};

const AdminPracticeContext = createContext<AdminPracticeContextValue | null>(
  null,
);

const UNIT_TYPE_BY_TAB: Record<
  Exclude<PracticeStudioTab, "writing-ai">,
  { passage: string; questionType: string }
> = {
  reading: {
    passage: "READING_PASSAGE",
    questionType: "READING_QUESTION_TYPE",
  },
  listening: {
    passage: "LISTENING_SECTION",
    questionType: "LISTENING_QUESTION_TYPE",
  },
};

function emptyReadingPassage(part = 1) {
  return factoryEmptyReadingPassage(part);
}

function emptyListeningPart(part = 1) {
  return factoryEmptyListeningPart(part);
}

export function AdminPracticeProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<AdminPracticeUnit[]>([]);
  const [prompts, setPrompts] = useState<AdminWritingPrompt[]>([]);
  const [activeTab, setActiveTab] = useState<PracticeStudioTab>("reading");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [unitList, promptList] = await Promise.all([
        getAdminPracticeUnits(),
        getAdminWritingPrompts(),
      ]);
      setUnits(unitList);
      setPrompts(promptList);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load practice content"));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createUnit = useCallback(
    async (payload: {
      type: string;
      title?: string;
      questionType?: string;
      passagePart?: number;
      listeningPart?: number;
      content: object;
      answerKey?: object;
    }) => {
      const identity = await suggestPracticeUnitIdentity(payload.type, {
        passagePart: payload.passagePart,
        listeningPart: payload.listeningPart,
        questionType: payload.questionType,
      });
      const created = await createPracticeUnit({
        code: identity.code,
        title: payload.title ?? identity.title,
        type: payload.type,
        questionType: payload.questionType,
        content: payload.content,
        answerKey: payload.answerKey ?? {},
      });
      setSelectedUnitId(created.id);
      setSelectedPromptId(null);
      await refresh({ silent: true });
      return created.id;
    },
    [refresh],
  );

  const value = useMemo<AdminPracticeContextValue>(
    () => ({
      loading,
      error,
      units,
      prompts,
      activeTab,
      setActiveTab,
      selectedUnitId,
      setSelectedUnitId,
      selectedPromptId,
      setSelectedPromptId,
      refresh,
      createUnit,
      saveUnit: async (id, payload) => {
        await updatePracticeUnit(id, payload);
        await refresh({ silent: true });
      },
      publishUnit: async (id) => {
        await publishPracticeUnit(id);
        await refresh({ silent: true });
      },
      archiveUnit: async (id) => {
        await archivePracticeUnit(id);
        await refresh({ silent: true });
      },
      removeUnit: async (id) => {
        await deletePracticeUnit(id);
        setSelectedUnitId(null);
        await refresh({ silent: true });
      },
      loadUnit: (id) => getAdminPracticeUnit(id),
      createPrompt: async (taskNumber, instruction) => {
        const identity = await suggestWritingPromptIdentity(taskNumber);
        const created = await createWritingPrompt({
          code: identity.code,
          title: identity.title,
          taskNumber,
          instruction,
        });
        setSelectedPromptId(created.id);
        setSelectedUnitId(null);
        await refresh({ silent: true });
        return created.id;
      },
      savePrompt: async (id, payload) => {
        await updateWritingPrompt(id, payload);
        await refresh({ silent: true });
      },
      publishPrompt: async (id) => {
        await publishWritingPrompt(id);
        await refresh({ silent: true });
      },
      loadPrompt: (id) => getAdminWritingPrompt(id),
    }),
    [
      loading,
      error,
      units,
      prompts,
      activeTab,
      selectedUnitId,
      selectedPromptId,
      refresh,
      createUnit,
    ],
  );

  return (
    <AdminPracticeContext.Provider value={value}>
      {children}
    </AdminPracticeContext.Provider>
  );
}

export function useAdminPractice() {
  const ctx = useContext(AdminPracticeContext);
  if (!ctx) {
    throw new Error("useAdminPractice must be used within AdminPracticeProvider");
  }
  return ctx;
}

export { UNIT_TYPE_BY_TAB, emptyReadingPassage, emptyListeningPart };
