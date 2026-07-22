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
  readingPassageStartNumber,
  renumberReadingContent,
  remapAnswerKeyByOrder,
  remapAnswerKeyForReadingContent,
  validatePartitionGroups,
  partitionStatusesForModule,
} from "@/lib/admin/content/numbering";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { syncAnswerKey } from "@/lib/admin/content/utils";
import type { QuestionGroup, ReadingContent } from "@/lib/exam/types";
import {
  nextPassageMarker,
  normalizePassageMarker,
} from "@/lib/exam/passage-sections";
import { syncMatchingInformationGroupsFromPassage } from "@/lib/exam/matching-information";
import { cn } from "@/lib/utils";

type Props = {
  testId?: string;
  content: ReadingContent;
  answerKey: AnswerKeyMap;
  onContentChange: (content: ReadingContent) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
  /** pane = nested scroll area; flow = grow naturally for a parent scroll container */
  layout?: "pane" | "flow";
  /** Practice units: one IELTS passage only — hide add-passage and multi-passage tabs */
  singlePassage?: boolean;
  /** Hide passage tabs/badge — passage part is chosen in Practice Creation only */
  hidePassageHeader?: boolean;
};

export function ReadingVisualEditor({
  testId,
  content,
  answerKey,
  onContentChange,
  onAnswerKeyChange,
  layout = "pane",
  singlePassage = false,
  hidePassageHeader = false,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const passages = content.passages ?? [];
  const passage = passages[activeIdx];

  function startNumberForPassage(index: number): number {
    return readingPassageStartNumber(passages, index);
  }

  function questionRangeText(groups: QuestionGroup[]): string {
    const nums = collectOrderedNumbers(groups);
    if (nums.length === 0) return "questions";
    const sorted = [...new Set(nums)].sort((a, b) => a - b);
    return `questions ${sorted[0]}–${sorted[sorted.length - 1]}`;
  }

  if (!passage) {
    return (
      <p className="text-sm text-muted">No passages. Add a passage to begin.</p>
    );
  }

  function updatePassage(patch: Partial<typeof passage>) {
    let groups = passage.groups ?? [];
    if (patch.paragraphs) {
      groups = syncMatchingInformationGroupsFromPassage(groups, patch.paragraphs);
    }
    const nextPassages = [...passages];
    nextPassages[activeIdx] = { ...passage, ...patch, groups };
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
      blurb:
        groups.length > 0
          ? `Read the text and answer ${questionRangeText(groups)}.`
          : passage.blurb,
    };
    const next = { ...content, passages: nextPassages };
    recomputeTotalQuestions(next);
    onContentChange(next);
    onAnswerKeyChange(syncAnswerKey("reading", next, remapped));
  }

  function renumberAll() {
    const renumbered = renumberReadingContent(content);
    const remapped = remapAnswerKeyForReadingContent(answerKey, content, renumbered);
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
  const flowLayout = layout === "flow";

  return (
    <div className={cn(flowLayout ? "space-y-5" : "flex min-h-0 flex-1 flex-col")}>
      {!hidePassageHeader && (
      <div className="shrink-0 space-y-4 border-b border-border bg-white pb-4 pt-1">
        <div className="flex flex-wrap gap-2">
          {singlePassage && passage ? (
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              Passage {passage.part}
            </span>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      )}

      <div
        className={cn(
          flowLayout ? "space-y-5" : "min-h-0 flex-1 space-y-5 overflow-y-auto pt-5",
        )}
      >
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
                    marker: nextPassageMarker(passage.paragraphs),
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
                onBlur={(e) => {
                  const normalized = normalizePassageMarker(e.target.value);
                  if (normalized === (para.marker ?? "")) return;
                  const paragraphs = [...passage.paragraphs];
                  paragraphs[idx] = { ...para, marker: normalized || undefined };
                  updatePassage({ paragraphs });
                }}
                className="h-8 w-16 text-center font-bold uppercase"
                placeholder="A"
              />
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto h-8 text-red-600"
                onClick={() => {
                  const paragraphs = passage.paragraphs.filter((_, i) => i !== idx);
                  updatePassage({
                    paragraphs: paragraphs.length
                      ? paragraphs
                      : [{ marker: "A", text: "" }],
                  });
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
        partitionFromOverride={startNumberForPassage(activeIdx)}
        testId={testId}
        answerKey={answerKey}
        passageParagraphs={passage.paragraphs}
        onGroupsChange={updateGroups}
        onAnswerKeyChange={onAnswerKeyChange}
      />
      </div>
    </div>
  );
}
