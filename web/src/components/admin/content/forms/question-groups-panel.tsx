"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionGroupEditor } from "@/components/admin/content/forms/question-group-editor";
import {
  createQuestionGroup,
  QUESTION_TYPE_LABELS,
} from "@/lib/admin/content/factories";
import {
  partitionForPart,
  renumberPartitionGroups,
} from "@/lib/admin/content/numbering";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { QuestionGroup } from "@/lib/exam/types";

const READING_TYPES: QuestionGroup["type"][] = [
  "instruction_screen",
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
  "mcq_choose_n",
  "sentence_completion",
  "short_answer",
];

const LISTENING_TYPES: QuestionGroup["type"][] = [
  "instruction_screen",
  "form_completion",
  "note_completion",
  "summary_completion",
  "summary_completion_list",
  "sentence_completion",
  "mcq_single",
  "mcq_multi",
  "mcq_choose_n",
  "matching",
  "flowchart_completion",
  "map_labeling",
  "table_completion",
  "short_answer",
];

type Props = {
  groups: QuestionGroup[];
  module: "reading" | "listening";
  /** 1-based part or passage number (IELTS partition). */
  partNumber: number;
  partitionFromOverride?: number;
  testId?: string;
  answerKey: AnswerKeyMap;
  /** Passage paragraph markers for matching_headings section mapping. */
  passageParagraphs?: { marker?: string }[];
  /** When set, only these group types can be added. */
  allowedTypes?: QuestionGroup["type"][];
  /** When set, caps how many groups the partition may contain. */
  maxGroups?: number;
  onGroupsChange: (groups: QuestionGroup[]) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
};

export function QuestionGroupsPanel({
  groups: groupsProp,
  module,
  partNumber,
  partitionFromOverride,
  testId,
  answerKey,
  passageParagraphs,
  allowedTypes,
  maxGroups,
  onGroupsChange,
  onAnswerKeyChange,
}: Props) {
  const groups = groupsProp ?? [];
  const types =
    allowedTypes ??
    (module === "reading" ? READING_TYPES : LISTENING_TYPES);
  const partitionFrom = partitionFromOverride ?? partitionForPart(module, partNumber).from;
  const canAddGroup = maxGroups == null || groups.length < maxGroups;

  function commitGroups(next: QuestionGroup[]) {
    onGroupsChange(renumberPartitionGroups(next, partitionFrom));
  }

  function addGroup(type: QuestionGroup["type"]) {
    commitGroups([
      ...groups,
      createQuestionGroup(type, partitionFrom, { passageParagraphs }),
    ]);
  }

  function updateGroup(index: number, group: QuestionGroup) {
    const next = [...groups];
    next[index] = group;
    commitGroups(next);
  }

  function removeGroup(index: number) {
    commitGroups(groups.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy">Question groups</h3>
        {canAddGroup && (
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
        )}
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
            passageParagraphs={passageParagraphs}
            onChange={(g) => updateGroup(idx, g)}
            onAnswerKeyChange={onAnswerKeyChange}
            onRemove={() => removeGroup(idx)}
          />
        ))
      )}
    </div>
  );
}
