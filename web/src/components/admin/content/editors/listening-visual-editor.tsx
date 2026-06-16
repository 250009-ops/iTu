"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListeningAudioUpload } from "@/components/admin/content/listening-audio-upload";
import { QuestionGroupsPanel } from "@/components/admin/content/forms/question-groups-panel";
import { recomputeTotalQuestions } from "@/lib/admin/content/factories";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { syncAnswerKey } from "@/lib/admin/content/utils";
import type { ListeningContent } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  testId?: string;
  content: ListeningContent;
  answerKey: AnswerKeyMap;
  onContentChange: (content: ListeningContent) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
  onMediaUpdated?: () => void;
};

export function ListeningVisualEditor({
  testId,
  content,
  answerKey,
  onContentChange,
  onAnswerKeyChange,
  onMediaUpdated,
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

  return (
    <div className="min-h-0">
      <div className="sticky top-0 z-10 -mx-5 space-y-4 border-b border-border bg-white px-5 pb-4 pt-1 shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:-mx-6 sm:px-6">
        {testId && (
          <ListeningAudioUpload testId={testId} onMediaUpdated={onMediaUpdated} />
        )}

        <div className="flex flex-wrap gap-2">
          {parts.map((p, idx) => (
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
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 pt-5">
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
          testId={testId}
          answerKey={answerKey}
          onGroupsChange={(groups) => updatePart({ groups })}
          onAnswerKeyChange={onAnswerKeyChange}
        />
      </div>
    </div>
  );
}
