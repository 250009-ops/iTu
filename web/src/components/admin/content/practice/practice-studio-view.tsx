"use client";

import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  AdminPracticeProvider,
  emptyListeningPart,
  emptyReadingPassage,
  UNIT_TYPE_BY_TAB,
  useAdminPractice,
  type PracticeStudioTab,
} from "@/contexts/admin-practice-context";
import { PracticeUnitEditor } from "@/components/admin/content/practice/practice-unit-editor";
import { PracticeWritingPromptEditor } from "@/components/admin/content/practice/practice-writing-prompt-editor";
import { PracticeUnitsTable } from "@/components/admin/content/practice/practice-units-table";
import { cn } from "@/lib/utils";

const TABS: { id: PracticeStudioTab; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing-ai", label: "Writing (AI)" },
];

function PracticeStudioInner() {
  const { toast } = useToast();
  const {
    loading,
    error,
    activeTab,
    setActiveTab,
    selectedUnitId,
    setSelectedUnitId,
    selectedPromptId,
    setSelectedPromptId,
    createUnit,
    createPrompt,
    units,
    prompts,
  } = useAdminPractice();

  const [creating, setCreating] = useState(false);
  const isEditingUnit = Boolean(selectedUnitId);
  const isEditingPrompt = Boolean(selectedPromptId);

  const filteredUnits = units.filter((u) => {
    if (activeTab === "writing-ai") return false;
    const skill = activeTab.toUpperCase();
    return u.skill === skill;
  });

  const filteredPrompts =
    activeTab === "writing-ai" ? prompts : [];

  async function handleCreateUnit(kind: "passage" | "questionType") {
    if (activeTab === "writing-ai") return;
    setCreating(true);
    try {
      const types = UNIT_TYPE_BY_TAB[activeTab];
      const type = kind === "passage" ? types.passage : types.questionType;
      const passage =
        activeTab === "reading" ? emptyReadingPassage() : emptyListeningPart();
      const content =
        activeTab === "reading"
          ? { passages: [passage] }
          : { parts: [passage] };
      await createUnit({
        type,
        questionType: kind === "questionType" ? "mcq_single" : undefined,
        content,
        answerKey: {},
      });
    } catch (err) {
      toast("Could not create practice unit", {
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleCreatePrompt(taskNumber: 1 | 2) {
    setCreating(true);
    try {
      await createPrompt(
        taskNumber,
        `Write your response for IELTS Writing Task ${taskNumber}.`,
      );
    } catch (err) {
      toast("Could not create writing prompt", {
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <div>
          <p className="text-xs font-medium text-muted">
            Admin &gt; Content Studio &gt; Practice Creation
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy">Practice Creation</h1>
          <p className="mt-1 text-sm text-muted">
            Build reading passages, listening sections, question-type drills, and AI writing prompts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedUnitId(null);
                setSelectedPromptId(null);
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-navy text-white"
                  : "text-muted hover:bg-slate-100",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isEditingUnit ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedUnitId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to units
            </Button>
            <PracticeUnitEditor unitId={selectedUnitId!} module={activeTab as "reading" | "listening"} />
          </div>
        ) : isEditingPrompt ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedPromptId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to prompts
            </Button>
            <PracticeWritingPromptEditor promptId={selectedPromptId!} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {activeTab !== "writing-ai" ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={creating}
                    onClick={() => void handleCreateUnit("passage")}
                  >
                    <Plus className="h-4 w-4" />
                    New {activeTab === "reading" ? "Passage" : "Section"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={creating}
                    onClick={() => void handleCreateUnit("questionType")}
                  >
                    <Plus className="h-4 w-4" />
                    New Question Type Drill
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={creating}
                    onClick={() => void handleCreatePrompt(1)}
                  >
                    <Plus className="h-4 w-4" />
                    New Task 1 Prompt
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={creating}
                    onClick={() => void handleCreatePrompt(2)}
                  >
                    <Plus className="h-4 w-4" />
                    New Task 2 Prompt
                  </Button>
                </>
              )}
            </div>

            {activeTab === "writing-ai" ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-muted">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrompts.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                        <td className="px-4 py-3">{p.title}</td>
                        <td className="px-4 py-3">Task {p.taskNumber}</td>
                        <td className="px-4 py-3 capitalize">{p.status}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPromptId(p.id)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <PracticeUnitsTable
                units={filteredUnits}
                onEdit={(id) => setSelectedUnitId(id)}
              />
            )}
          </>
        )}
      </div>
    </ApiDataShell>
  );
}

export function PracticeStudioView() {
  return (
    <AdminPracticeProvider>
      <PracticeStudioInner />
    </AdminPracticeProvider>
  );
}
