"use client";

import { useEffect, useState } from "react";
import { ReadingVisualEditor } from "@/components/admin/content/editors/reading-visual-editor";
import { ListeningVisualEditor } from "@/components/admin/content/editors/listening-visual-editor";
import { RichTextField } from "@/components/admin/content/forms/rich-text-field";
import { QuestionGroupsPanel } from "@/components/admin/content/forms/question-groups-panel";
import { PracticeListeningAudioUpload } from "@/components/admin/content/practice/practice-listening-audio-upload";
import {
  listeningSectionPracticeTitle,
  type ListeningSectionPart,
} from "@/components/admin/content/practice/listening-section-part-tabs";
import {
  readingPassagePracticeTitle,
  type ReadingPassagePart,
} from "@/components/admin/content/practice/reading-passage-part-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminPractice } from "@/contexts/admin-practice-context";
import {
  emptyListeningContent,
  emptyReadingContent,
  QUESTION_TYPE_LABELS,
  recomputeTotalQuestions,
} from "@/lib/admin/content/factories";
import { normalizeContent } from "@/lib/admin/content/normalize";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type {
  ListeningContent,
  ListeningPart,
  QuestionGroup,
  ReadingContent,
  ReadingPassage,
} from "@/lib/exam/types";
import { useToast } from "@/components/ui/toast";

type Props = {
  unitId: string;
};

type LoadedUnit = {
  title: string;
  type: string;
  skill: string;
  questionType: string | null;
  durationMin: number;
  status: string;
  content: ReadingContent | ListeningContent;
  answerKey?: AnswerKeyMap;
};

function isQuestionTypeUnit(type: string) {
  return type.includes("QUESTION_TYPE");
}

function asReadingContent(content: ReadingContent | ListeningContent): ReadingContent {
  if ("passages" in content && Array.isArray(content.passages)) {
    return content;
  }
  return emptyReadingContent("Practice Reading");
}

function asListeningContent(content: ReadingContent | ListeningContent): ListeningContent {
  if ("parts" in content && Array.isArray(content.parts)) {
    return content;
  }
  return emptyListeningContent("Practice Listening");
}

export function PracticeUnitEditor({ unitId }: Props) {
  const { loadUnit, saveUnit, publishUnit, archiveUnit, removeUnit } =
    useAdminPractice();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [unitType, setUnitType] = useState("");
  const [module, setModule] = useState<"reading" | "listening">("reading");
  const [title, setTitle] = useState("");
  const [questionType, setQuestionType] = useState<QuestionGroup["type"]>("mcq_single");
  const [durationMin, setDurationMin] = useState(20);
  const [status, setStatus] = useState("draft");
  const [readingContent, setReadingContent] = useState<ReadingContent>(
    emptyReadingContent("Practice Reading"),
  );
  const [listeningContent, setListeningContent] = useState<ListeningContent>(
    emptyListeningContent("Practice Listening"),
  );
  const [answerKey, setAnswerKey] = useState<AnswerKeyMap>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadUnit(unitId)
      .then((raw) => {
        if (!active) return;
        const unit = raw as LoadedUnit;
        setUnitType(unit.type);
        setModule(unit.skill === "listening" ? "listening" : "reading");
        setTitle(unit.title);
        setQuestionType((unit.questionType as QuestionGroup["type"]) ?? "mcq_single");
        setDurationMin(unit.durationMin);
        setStatus(unit.status.toLowerCase());
        if (unit.skill === "listening") {
          setListeningContent(
            asListeningContent(
              normalizeContent("listening", unit.content) as ListeningContent,
            ),
          );
        } else {
          setReadingContent(
            asReadingContent(
              normalizeContent("reading", unit.content) as ReadingContent,
            ),
          );
        }
        setAnswerKey((unit.answerKey as AnswerKeyMap) ?? {});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [unitId, loadUnit]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted">Loading…</div>;
  }

  const isDrill = isQuestionTypeUnit(unitType);
  const isReadingPassage =
    !isDrill && module === "reading" && unitType === "READING_PASSAGE";
  const isListeningSection =
    !isDrill && module === "listening" && unitType === "LISTENING_SECTION";
  const autoTitle = isReadingPassage
    ? readingPassagePracticeTitle(
        (readingContent.passages[0]?.part as ReadingPassagePart | undefined) ?? 1,
      )
    : isListeningSection
      ? listeningSectionPracticeTitle(
          (listeningContent.parts[0]?.part as ListeningSectionPart | undefined) ??
            1,
        )
      : null;

  function handleReadingContentChange(content: ReadingContent) {
    if (isReadingPassage && (content.passages?.length ?? 0) > 1) {
      setReadingContent({
        ...content,
        passages: [content.passages[0]!],
      });
      return;
    }
    setReadingContent(content);
  }

  async function persistDraft(options?: { manageSavingState?: boolean }): Promise<boolean> {
    const manageSaving = options?.manageSavingState !== false;
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (manageSaving) setSaving(true);
    try {
      const content = module === "reading" ? readingContent : listeningContent;
      const resolvedTitle = autoTitle ?? title;
      await saveUnit(unitId, {
        title: resolvedTitle,
        questionType: isDrill ? questionType : undefined,
        content,
        answerKey,
        durationMin,
      });
      if (autoTitle) setTitle(autoTitle);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: "auto" });
        });
      }
      return true;
    } catch {
      toast("Save failed", { variant: "error" });
      return false;
    } finally {
      if (manageSaving) setSaving(false);
    }
  }

  async function handleSave() {
    const saved = await persistDraft();
    if (saved) {
      toast("Saved", { variant: "success" });
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const saved = await persistDraft({ manageSavingState: false });
      if (!saved) return;
      await publishUnit(unitId);
      setStatus("published");
      toast("Published", { variant: "success" });
    } catch {
      toast("Publish failed", { variant: "error" });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input
            value={autoTitle ?? title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={Boolean(autoTitle)}
            className={autoTitle ? "bg-slate-50 font-medium" : undefined}
          />
          {autoTitle && (
            <p className="mt-1 text-xs text-muted">
              Title follows the passage/section tab this unit was created from.
            </p>
          )}
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
          />
        </div>
        {isDrill && (
          <div>
            <Label>Question format</Label>
            <Input
              value={QUESTION_TYPE_LABELS[questionType] ?? questionType}
              readOnly
              className="bg-slate-50 font-medium"
            />
            <p className="mt-1 text-xs text-muted">
              Format is fixed when the drill is created. Delete and recreate to change it.
            </p>
          </div>
        )}
      </div>

      {isDrill ? (
        <PracticeQuestionTypeBody
          module={module}
          unitId={unitId}
          questionType={questionType}
          readingContent={readingContent}
          listeningContent={listeningContent}
          answerKey={answerKey}
          onReadingContentChange={setReadingContent}
          onListeningContentChange={setListeningContent}
          onAnswerKeyChange={setAnswerKey}
        />
      ) : module === "reading" ? (
        <div className="min-h-[480px]">
          <ReadingVisualEditor
            testId={unitId}
            content={readingContent}
            answerKey={answerKey}
            onContentChange={handleReadingContentChange}
            onAnswerKeyChange={setAnswerKey}
            layout="flow"
            singlePassage={isReadingPassage}
            hidePassageHeader={isReadingPassage}
            practiceUnit={isReadingPassage}
          />
        </div>
      ) : (
        <div className="min-h-[480px] space-y-4">
          <PracticeListeningAudioUpload unitId={unitId} />
          <ListeningVisualEditor
            content={listeningContent}
            answerKey={answerKey}
            onContentChange={setListeningContent}
            onAnswerKeyChange={setAnswerKey}
            layout="flow"
            singlePart={isListeningSection}
            practiceUnit={isListeningSection}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={saving || publishing || status === "published"}
          onClick={() => void handleSave()}
        >
          Save draft
        </Button>
        {status === "draft" && (
          <Button
            variant="secondary"
            disabled={saving || publishing}
            onClick={() => void handlePublish()}
          >
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        )}
        {status === "published" && (
          <Button variant="secondary" onClick={() => void archiveUnit(unitId)}>
            Archive
          </Button>
        )}
        {status === "draft" && (
          <Button variant="ghost" onClick={() => void removeUnit(unitId)}>
            Delete draft
          </Button>
        )}
      </div>
    </div>
  );
}

function PracticeQuestionTypeBody({
  module,
  unitId,
  questionType,
  readingContent,
  listeningContent,
  answerKey,
  onReadingContentChange,
  onListeningContentChange,
  onAnswerKeyChange,
}: {
  module: "reading" | "listening";
  unitId: string;
  questionType: QuestionGroup["type"];
  readingContent: ReadingContent;
  listeningContent: ListeningContent;
  answerKey: AnswerKeyMap;
  onReadingContentChange: (content: ReadingContent) => void;
  onListeningContentChange: (content: ListeningContent) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
}) {
  if (module === "reading") {
    const passage = readingContent.passages[0] ?? emptyReadingContent().passages[0];
    const stimulus = passage.paragraphs[0]?.text ?? "";

    function updatePassage(patch: Partial<ReadingPassage>) {
      const nextPassage = { ...passage, ...patch };
      onReadingContentChange({
        ...readingContent,
        passages: [nextPassage],
      });
    }

    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            {QUESTION_TYPE_LABELS[questionType]} drill
          </p>
          <p className="mt-1">
            Add one question group in this format only. Use the optional stimulus
            below when the question type needs reading context.
          </p>
        </div>
        <RichTextField
          label="Reading stimulus (optional)"
          value={stimulus}
          onChange={(text) =>
            updatePassage({
              paragraphs: [{ marker: "A", text }],
            })
          }
          rows={6}
          placeholder="Short passage or context for this drill…"
        />
        <QuestionGroupsPanel
          groups={passage.groups ?? []}
          module="reading"
          partNumber={passage.part}
          testId={unitId}
          answerKey={answerKey}
          passageParagraphs={passage.paragraphs}
          allowedTypes={[questionType]}
          maxGroups={1}
          onGroupsChange={(groups) => updatePassage({ groups })}
          onAnswerKeyChange={onAnswerKeyChange}
        />
      </div>
    );
  }

  const part = listeningContent.parts[0] ?? emptyListeningContent().parts[0];

  function updatePart(patch: Partial<ListeningPart>) {
    onListeningContentChange({
      ...listeningContent,
      parts: [{ ...part, ...patch }],
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Question-type drills use one question format only. Upload audio, then build
        the single question group.
      </div>
      <PracticeListeningAudioUpload unitId={unitId} />
      <QuestionGroupsPanel
        groups={part.groups ?? []}
        module="listening"
        partNumber={part.part}
        testId={unitId}
        answerKey={answerKey}
        allowedTypes={[questionType]}
        maxGroups={1}
        onGroupsChange={(groups) => updatePart({ groups })}
        onAnswerKeyChange={onAnswerKeyChange}
      />
    </div>
  );
}
