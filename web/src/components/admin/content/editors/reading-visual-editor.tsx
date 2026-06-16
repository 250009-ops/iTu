"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { RichTextField } from "@/components/admin/content/forms/rich-text-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionGroupsPanel } from "@/components/admin/content/forms/question-groups-panel";
import {
  emptyReadingPassage,
  recomputeTotalQuestions,
} from "@/lib/admin/content/factories";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { syncAnswerKey } from "@/lib/admin/content/utils";
import type { ReadingContent } from "@/lib/exam/types";
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

  function updateGroups(groups: typeof passage.groups) {
    updatePassage({ groups });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {passages.map((p, idx) => (
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
          </button>
        ))}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Passage title</Label>
          <Input
            value={passage.title}
            onChange={(e) => updatePassage({ title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Blurb</Label>
          <Input
            value={passage.blurb}
            onChange={(e) => updatePassage({ blurb: e.target.value })}
          />
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
        testId={testId}
        answerKey={answerKey}
        onGroupsChange={updateGroups}
        onAnswerKeyChange={onAnswerKeyChange}
      />
    </div>
  );
}
