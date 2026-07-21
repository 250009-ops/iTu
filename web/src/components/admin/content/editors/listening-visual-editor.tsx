"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { PartitionBanner } from "@/components/admin/content/partition-banner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ListeningAudioUpload } from "@/components/admin/content/listening-audio-upload";
import { QuestionGroupsPanel } from "@/components/admin/content/forms/question-groups-panel";
import { recomputeTotalQuestions } from "@/lib/admin/content/factories";
import {
  collectOrderedNumbers,
  defaultPartitionBlurb,
  renumberListeningContent,
  remapAnswerKeyByOrder,
  remapAnswerKeyForListeningContent,
  partitionStatusesForModule,
  validatePartitionGroups,
} from "@/lib/admin/content/numbering";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { syncAnswerKey } from "@/lib/admin/content/utils";
import type { ListeningContent, QuestionGroup } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  testId?: string;
  content: ListeningContent;
  answerKey: AnswerKeyMap;
  onContentChange: (content: ListeningContent) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
  onMediaUpdated?: () => void;
  layout?: "pane" | "flow";
};

export function ListeningVisualEditor({
  testId,
  content,
  answerKey,
  onContentChange,
  onAnswerKeyChange,
  onMediaUpdated,
  layout = "pane",
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const parts = content.parts ?? [];
  const part = parts[activeIdx];

  if (!part) {
    return <p className="text-sm text-muted">No listening parts defined.</p>;
  }

  function commit(next: ListeningContent) {
    recomputeTotalQuestions(next);
    onContentChange(next);
    onAnswerKeyChange(syncAnswerKey("listening", next, answerKey));
  }

  function updatePart(patch: Partial<typeof part>) {
    const nextParts = [...parts];
    nextParts[activeIdx] = { ...part, ...patch };
    commit({ ...content, parts: nextParts });
  }

  function updateGroups(groups: QuestionGroup[]) {
    const oldNums = collectOrderedNumbers(part.groups ?? []);
    const newNums = collectOrderedNumbers(groups);
    const remapped = remapAnswerKeyByOrder(answerKey, oldNums, newNums);
    const nextPart = {
      ...part,
      groups,
      blurb: groups.length > 0 ? defaultPartitionBlurb("listening", part.part) : part.blurb,
    };
    const nextParts = [...parts];
    nextParts[activeIdx] = nextPart;
    const next = { ...content, parts: nextParts };
    recomputeTotalQuestions(next);
    onContentChange(next);
    onAnswerKeyChange(syncAnswerKey("listening", next, remapped));
  }

  function renumberAll() {
    const renumbered = renumberListeningContent(content);
    const remapped = remapAnswerKeyForListeningContent(answerKey, content, renumbered);
    recomputeTotalQuestions(renumbered);
    onContentChange(renumbered);
    onAnswerKeyChange(syncAnswerKey("listening", renumbered, remapped));
  }

  const partitionStatus = validatePartitionGroups(
    "listening",
    part.part,
    part.groups ?? [],
    answerKey,
  );
  const allPartitionStatuses = partitionStatusesForModule("listening", content, answerKey);
  const flowLayout = layout === "flow";

  return (
    <div className={cn(flowLayout ? "space-y-5" : "flex min-h-0 flex-1 flex-col")}>
      <div className="shrink-0 space-y-4 border-b border-border bg-white pb-4 pt-1">
        {testId && (
          <ListeningAudioUpload testId={testId} onMediaUpdated={onMediaUpdated} />
        )}

        <div className="flex flex-wrap gap-2">
          {parts.map((p, idx) => {
            const tabStatus = allPartitionStatuses.find((s) => s.part === p.part);
            const tabCount = tabStatus?.count ?? 0;
            const expected = tabStatus?.range.expectedCount ?? 10;
            return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                activeIdx === idx
                  ? "bg-sky-600 text-white"
                  : "border border-border bg-white text-muted hover:text-navy",
              )}
            >
              Part {p.part}
              <span className="ml-1.5 text-xs font-normal opacity-80">
                ({tabCount}/{expected})
              </span>
            </button>
            );
          })}
        </div>
      </div>

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
          <div className="space-y-2">
            <Label>Part title</Label>
            <Input value={part.title} onChange={(e) => updatePart({ title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Blurb</Label>
            <Input value={part.blurb} onChange={(e) => updatePart({ blurb: e.target.value })} />
          </div>
        </div>

        <QuestionGroupsPanel
          groups={part.groups}
          module="listening"
          partNumber={part.part}
          testId={testId}
          answerKey={answerKey}
          onGroupsChange={updateGroups}
          onAnswerKeyChange={onAnswerKeyChange}
        />
      </div>
    </div>
  );
}
