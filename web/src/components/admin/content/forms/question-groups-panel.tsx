"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionGroupEditor } from "@/components/admin/content/forms/question-group-editor";
import {
  createQuestionGroup,
  QUESTION_TYPE_LABELS,
} from "@/lib/admin/content/factories";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { QuestionGroup } from "@/lib/exam/types";

const READING_TYPES: QuestionGroup["type"][] = [
  "tfng",
  "yng",
  "note_completion",
  "summary_completion",
  "matching_headings",
  "matching",
  "mcq_single",
  "mcq_multi",
  "sentence_completion",
];

const LISTENING_TYPES: QuestionGroup["type"][] = [
  "form_completion",
  "note_completion",
  "mcq_single",
  "matching",
  "map_labeling",
  "table_completion",
  "short_answer",
];

type Props = {
  groups: QuestionGroup[];
  module: "reading" | "listening";
  testId?: string;
  answerKey: AnswerKeyMap;
  onGroupsChange: (groups: QuestionGroup[]) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
};

export function QuestionGroupsPanel({
  groups,
  module,
  testId,
  answerKey,
  onGroupsChange,
  onAnswerKeyChange,
}: Props) {
  const types = module === "reading" ? READING_TYPES : LISTENING_TYPES;

  function nextQuestionNumber(): number {
    let max = 0;
    for (const g of groups) {
      if (g.to > max) max = g.to;
    }
    return max + 1;
  }

  function addGroup(type: QuestionGroup["type"]) {
    const from = nextQuestionNumber();
    onGroupsChange([...groups, createQuestionGroup(type, from)]);
  }

  function updateGroup(index: number, group: QuestionGroup) {
    const next = [...groups];
    next[index] = group;
    onGroupsChange(next);
  }

  function removeGroup(index: number) {
    onGroupsChange(groups.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy">Question groups</h3>
        <div className="flex flex-wrap gap-1">
          {types.map((type) => (
            <Button
              key={type}
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={() => addGroup(type)}
            >
              <Plus className="h-3 w-3" />
              {QUESTION_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted">
          No question groups yet. Add one using the buttons above.
        </p>
      ) : (
        groups.map((group, idx) => (
          <QuestionGroupEditor
            key={group.id}
            group={group}
            testId={testId}
            answerKey={answerKey}
            onChange={(g) => updateGroup(idx, g)}
            onAnswerKeyChange={onAnswerKeyChange}
            onRemove={() => removeGroup(idx)}
          />
        ))
      )}
    </div>
  );
}
