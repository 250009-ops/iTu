"use client";

import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { PartitionBanner } from "@/components/admin/content/partition-banner";
import { RichTextField } from "@/components/admin/content/forms/rich-text-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionGroupsPanel } from "@/components/admin/content/forms/question-groups-panel";
import {
  emptyReadingPassage,
  recomputeTotalQuestions,
} from "@/lib/admin/content/factories";
import {
  collectOrderedNumbers,
  defaultPartitionBlurb,
  renumberReadingContent,
  remapAnswerKeyByOrder,
  validatePartitionGroups,
  partitionStatusesForModule,
} from "@/lib/admin/content/numbering";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { syncAnswerKey } from "@/lib/admin/content/utils";
import type { QuestionGroup, ReadingContent } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  testId?: string;
  content: ReadingContent;
  answerKey: AnswerKeyMap;
  onContentChange: (content: ReadingContent) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
};

export function ReadingVisualEditor({
  testId,
  content,
  answerKey,
  onContentChange,
  onAnswerKeyChange,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const passages = content.passages ?? [];
  const passage = passages[activeIdx];

  if (!passage) {
    return (
      <p className="text-sm text-muted">No passages. Add a passage to begin.</p>
    );
  }

  function updatePassage(patch: Partial<typeof passage>) {
    const nextPassages = [...passages];
    nextPassages[activeIdx] = { ...passage, ...patch };
    const next = { ...content, passages: nextPassages };
    recomputeTotalQuestions(next);
    onContentChange(next);
    onAnswerKeyChange(syncAnswerKey("reading", next, answerKey));
  }

  function updateGroups(groups: QuestionGroup[]) {
    const oldNums = collectOrderedNumbers(passage.groups ?? []);
    const newNums = collectOrderedNumbers(groups);
    const remapped = remapAnswerKeyByOrder(answerKey, oldNums, newNums);
    const nextPassages = [...passages];
    nextPassages[activeIdx] = {
      ...passage,
      groups,
      blurb: groups.length > 0 ? defaultPartitionBlurb("reading", passage.part) : passage.blurb,
    };
    const next = { ...content, passages: nextPassages };
    recomputeTotalQuestions(next);
    onContentChange(next);
    onAnswerKeyChange(syncAnswerKey("reading", next, remapped));
  }

  function renumberAll() {
    const oldNums = collectOrderedNumbers(
      passages.flatMap((p) => p.groups ?? []),
    );
    const renumbered = renumberReadingContent(content);
    const newNums = collectOrderedNumbers(
      renumbered.passages.flatMap((p) => p.groups ?? []),
    );
    const remapped = remapAnswerKeyByOrder(answerKey, oldNums, newNums);
    recomputeTotalQuestions(renumbered);
    onContentChange(renumbered);
    onAnswerKeyChange(syncAnswerKey("reading", renumbered, remapped));
  }

  const partitionStatus = validatePartitionGroups(
    "reading",
    passage.part,
    passage.groups ?? [],
    answerKey,
  );
  const allPartitionStatuses = partitionStatusesForModule("reading", content, answerKey);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {passages.map((p, idx) => {
          const tabStatus = allPartitionStatuses.find((s) => s.part === p.part);
          const tabCount = tabStatus?.count ?? 0;
          const expected = tabStatus?.range.expectedCount ?? 13;
          return (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              activeIdx === idx
                ? "bg-emerald-600 text-white"
                : "border border-border bg-white text-muted hover:text-navy",
            )}
          >
            Passage {p.part}
            <span className="ml-1.5 text-xs font-normal opacity-80">
              ({tabCount}/{expected})
            </span>
          </button>
          );
        })}
        {passages.length < 3 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const part = passages.length + 1;
              const nextPassages = [...passages, emptyReadingPassage(part)];
              const next = { ...content, passages: nextPassages };
              onContentChange(next);
              setActiveIdx(nextPassages.length - 1);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add passage
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <PartitionBanner status={partitionStatus} className="flex-1 min-w-[280px]" />
        <Button variant="secondary" size="sm" onClick={renumberAll}>
          <RefreshCw className="h-3.5 w-3.5" />
          Renumber all
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Passage title</Label>
          <Input
            value={passage.title}
            onChange={(e) => updatePassage({ title: e.target.value })}
            placeholder="The discovery of a baby mammoth"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Subtitle (optional)</Label>
          <Input
            value={passage.subtitle ?? ""}
            onChange={(e) =>
              updatePassage({ subtitle: e.target.value.trim() || undefined })
            }
            placeholder="A near-perfect frozen mammoth offers clues to a great vanished species"
          />
          <p className="text-xs text-muted">
            Shown in italics under the title in the exam — like the Cambridge reading tagline.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Instructions blurb</Label>
          <Input
            value={passage.blurb}
            onChange={(e) => updatePassage({ blurb: e.target.value })}
            placeholder="Read the text and answer questions 14–26."
          />
          <p className="text-xs text-muted">
            Shown in the part header bar, not in the passage pane.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-navy">Passage text</Label>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              updatePassage({
                paragraphs: [
                  ...passage.paragraphs,
                  {
                    marker: String.fromCharCode(65 + passage.paragraphs.length),
                    text: "",
                  },
                ],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add paragraph
          </Button>
        </div>
        {(passage.paragraphs ?? []).map((para, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <Input
                value={para.marker ?? ""}
                onChange={(e) => {
                  const paragraphs = [...passage.paragraphs];
                  paragraphs[idx] = { ...para, marker: e.target.value };
                  updatePassage({ paragraphs });
                }}
                className="h-8 w-16 text-center font-bold"
                placeholder="A"
              />
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto h-8 text-red-600"
                onClick={() => {
                  const paragraphs = passage.paragraphs.filter((_, i) => i !== idx);
                  updatePassage({ paragraphs: paragraphs.length ? paragraphs : [{ text: "" }] });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <RichTextField
              label="Paragraph text"
              value={para.text}
              onChange={(text) => {
                const paragraphs = [...passage.paragraphs];
                paragraphs[idx] = { ...para, text };
                updatePassage({ paragraphs });
              }}
              rows={5}
              placeholder="Paragraph text…"
            />
          </div>
        ))}
      </div>

      <QuestionGroupsPanel
        groups={passage.groups}
        module="reading"
        partNumber={passage.part}
        testId={testId}
        answerKey={answerKey}
        passageParagraphs={passage.paragraphs}
        onGroupsChange={updateGroups}
        onAnswerKeyChange={onAnswerKeyChange}
      />
    </div>
  );
}
