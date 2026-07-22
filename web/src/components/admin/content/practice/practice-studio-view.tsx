"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { scrollPracticeEditorToTop } from "@/components/admin/content/practice/practice-editor-scroll";
import {
  ListeningSectionPartTabs,
  listeningSectionPracticeTitle,
  type ListeningSectionPart,
} from "@/components/admin/content/practice/listening-section-part-tabs";
import { PracticeUnitsSection } from "@/components/admin/content/practice/practice-units-section";
import { PracticeWritingPromptsSection } from "@/components/admin/content/practice/practice-writing-prompts-section";
import { PracticeUnitEditor } from "@/components/admin/content/practice/practice-unit-editor";
import { PracticeWritingPromptEditor } from "@/components/admin/content/practice/practice-writing-prompt-editor";
import {
  ReadingPassagePartTabs,
  readingPassagePracticeTitle,
  type ReadingPassagePart,
} from "@/components/admin/content/practice/reading-passage-part-select";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
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
import { createQuestionGroup, QUESTION_TYPE_LABELS } from "@/lib/admin/content/factories";
import { defaultPartitionBlurb } from "@/lib/admin/content/numbering";
import type { QuestionGroup } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

const TABS: { id: PracticeStudioTab; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing-ai", label: "Writing (AI)" },
];

const READING_DRILL_TYPES: QuestionGroup["type"][] = [
  "tfng",
  "yng",
  "form_completion",
  "note_completion",
  "summary_completion",
  "summary_completion_list",
  "table_completion",
  "flowchart_completion",
  "map_labeling",
  "matching_information",
  "matching_headings",
  "matching_features",
  "matching",
  "mcq_single",
  "mcq_multi",
  "sentence_completion",
  "short_answer",
];

const LISTENING_DRILL_TYPES: QuestionGroup["type"][] = [
  "form_completion",
  "note_completion",
  "summary_completion",
  "summary_completion_list",
  "sentence_completion",
  "mcq_single",
  "mcq_multi",
  "matching",
  "flowchart_completion",
  "map_labeling",
  "table_completion",
  "short_answer",
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
  const [readingPassagePart, setReadingPassagePart] = useState<ReadingPassagePart>(1);
  const [listeningSectionPart, setListeningSectionPart] =
    useState<ListeningSectionPart>(1);
  const [readingDrillType, setReadingDrillType] =
    useState<QuestionGroup["type"]>("mcq_single");
  const [listeningDrillType, setListeningDrillType] =
    useState<QuestionGroup["type"]>("mcq_single");

  const isEditingUnit = Boolean(selectedUnitId);
  const isEditingPrompt = Boolean(selectedPromptId);

  const readingPassages = useMemo(
    () => units.filter((u) => u.type === "READING_PASSAGE"),
    [units],
  );
  const filteredReadingPassages = useMemo(
    () => readingPassages.filter((u) => (u.passagePart ?? 1) === readingPassagePart),
    [readingPassages, readingPassagePart],
  );
  const readingDrills = useMemo(
    () => units.filter((u) => u.type === "READING_QUESTION_TYPE"),
    [units],
  );
  const listeningSections = useMemo(
    () => units.filter((u) => u.type === "LISTENING_SECTION"),
    [units],
  );
  const filteredListeningSections = useMemo(
    () =>
      listeningSections.filter((u) => (u.passagePart ?? 1) === listeningSectionPart),
    [listeningSections, listeningSectionPart],
  );
  const listeningDrills = useMemo(
    () => units.filter((u) => u.type === "LISTENING_QUESTION_TYPE"),
    [units],
  );
  const task1Prompts = useMemo(
    () => prompts.filter((p) => p.taskNumber === 1),
    [prompts],
  );
  const task2Prompts = useMemo(
    () => prompts.filter((p) => p.taskNumber === 2),
    [prompts],
  );

  async function handleCreatePassage() {
    if (activeTab === "writing-ai") return;
    setCreating(true);
    try {
      const types = UNIT_TYPE_BY_TAB[activeTab];
      if (activeTab === "reading") {
        const passage = emptyReadingPassage(readingPassagePart);
        await createUnit({
          type: types.passage,
          title: readingPassagePracticeTitle(readingPassagePart),
          passagePart: readingPassagePart,
          content: {
            passages: [
              {
                ...passage,
                blurb: defaultPartitionBlurb("reading", readingPassagePart),
                groups: [],
              },
            ],
          },
          answerKey: {},
        });
      } else {
        const passage = emptyListeningPart(listeningSectionPart);
        await createUnit({
          type: types.passage,
          title: listeningSectionPracticeTitle(listeningSectionPart),
          listeningPart: listeningSectionPart,
          content: {
            parts: [
              {
                ...passage,
                blurb: defaultPartitionBlurb("listening", listeningSectionPart),
                groups: [],
              },
            ],
          },
          answerKey: {},
        });
      }
    } catch (err) {
      toast("Could not create practice unit", {
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateDrill() {
    if (activeTab === "writing-ai") return;
    setCreating(true);
    try {
      const types = UNIT_TYPE_BY_TAB[activeTab];
      const drillType =
        activeTab === "reading" ? readingDrillType : listeningDrillType;
      const group = createQuestionGroup(drillType, 1);
      const partition =
        activeTab === "reading" ? emptyReadingPassage() : emptyListeningPart();
      const partitionWithGroup = { ...partition, groups: [group] };
      const content =
        activeTab === "reading"
          ? { passages: [partitionWithGroup] }
          : { parts: [partitionWithGroup] };
      await createUnit({
        type: types.questionType,
        title: `${QUESTION_TYPE_LABELS[drillType]} drill`,
        questionType: drillType,
        content,
        answerKey: {},
      });
    } catch (err) {
      toast("Could not create question-type drill", {
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

  useEffect(() => {
    if (!selectedUnitId && !selectedPromptId) return;
    scrollPracticeEditorToTop();
  }, [selectedUnitId, selectedPromptId]);

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage innerClassName="space-y-8">
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
            <PracticeUnitEditor unitId={selectedUnitId!} />
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
        ) : activeTab === "reading" ? (
          <div className="space-y-10">
            <PracticeUnitsSection
              title="Reading passages"
              description="One IELTS passage per unit. Use the tabs to browse Passage 1, 2, or 3 — new units are created for the active tab."
              units={filteredReadingPassages}
              onEdit={setSelectedUnitId}
              emptyMessage={`No Passage ${readingPassagePart} units yet.`}
              tableVariant="reading-passage"
              tabs={
                <ReadingPassagePartTabs
                  value={readingPassagePart}
                  onChange={setReadingPassagePart}
                  disabled={creating}
                />
              }
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  disabled={creating}
                  onClick={() => void handleCreatePassage()}
                >
                  <Plus className="h-4 w-4" />
                  New Passage {readingPassagePart}
                </Button>
              }
            />
            <PracticeUnitsSection
              title="Reading question-type drills"
              description="Focused practice on one question format. Pick the format first, then add an optional short stimulus and one question group."
              units={readingDrills}
              onEdit={setSelectedUnitId}
              emptyMessage="No reading question-type drills yet."
              tableVariant="reading-drill"
              actions={
                <>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <span className="font-medium text-navy">Question format</span>
                    <select
                      value={readingDrillType}
                      onChange={(e) =>
                        setReadingDrillType(e.target.value as QuestionGroup["type"])
                      }
                      className="h-9 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy"
                    >
                    {READING_DRILL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={creating}
                    onClick={() => void handleCreateDrill()}
                  >
                    <Plus className="h-4 w-4" />
                    New Question-Type Drill
                  </Button>
                </>
              }
            />
          </div>
        ) : activeTab === "listening" ? (
          <div className="space-y-10">
            <PracticeUnitsSection
              title="Listening sections"
              description="One IELTS section per unit. Use the tabs to browse Sections 1–4 — new units are created for the active tab."
              units={filteredListeningSections}
              onEdit={setSelectedUnitId}
              emptyMessage={`No Section ${listeningSectionPart} units yet.`}
              tabs={
                <ListeningSectionPartTabs
                  value={listeningSectionPart}
                  onChange={setListeningSectionPart}
                  disabled={creating}
                />
              }
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  disabled={creating}
                  onClick={() => void handleCreatePassage()}
                >
                  <Plus className="h-4 w-4" />
                  New Section {listeningSectionPart}
                </Button>
              }
            />
            <PracticeUnitsSection
              title="Listening question-type drills"
              description="Single question format per drill — one group only with section audio."
              units={listeningDrills}
              onEdit={setSelectedUnitId}
              emptyMessage="No listening question-type drills yet."
              tableVariant="listening-drill"
              actions={
                <>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <span className="font-medium text-navy">Question format</span>
                    <select
                      value={listeningDrillType}
                      onChange={(e) =>
                        setListeningDrillType(e.target.value as QuestionGroup["type"])
                      }
                      className="h-9 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy"
                    >
                    {LISTENING_DRILL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={creating}
                    onClick={() => void handleCreateDrill()}
                  >
                    <Plus className="h-4 w-4" />
                    New Question-Type Drill
                  </Button>
                </>
              }
            />
          </div>
        ) : (
          <div className="space-y-10">
            <PracticeWritingPromptsSection
              title="Task 1 prompts"
              description="AI writing coach prompts for Academic Task 1."
              prompts={task1Prompts}
              onEdit={setSelectedPromptId}
              emptyMessage="No Task 1 prompts yet."
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  disabled={creating}
                  onClick={() => void handleCreatePrompt(1)}
                >
                  <Plus className="h-4 w-4" />
                  New Task 1 Prompt
                </Button>
              }
            />
            <PracticeWritingPromptsSection
              title="Task 2 prompts"
              description="AI writing coach prompts for Task 2 essays."
              prompts={task2Prompts}
              onEdit={setSelectedPromptId}
              emptyMessage="No Task 2 prompts yet."
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={creating}
                  onClick={() => void handleCreatePrompt(2)}
                >
                  <Plus className="h-4 w-4" />
                  New Task 2 Prompt
                </Button>
              }
            />
          </div>
        )}
      </PortalPage>
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
