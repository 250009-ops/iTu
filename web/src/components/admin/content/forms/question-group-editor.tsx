"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AnswerKeyField,
  AnswerKeyMultiField,
} from "@/components/admin/content/forms/answer-key-field";
import { MapLabelingEditor } from "@/components/admin/content/forms/map-labeling-editor";
import { TableCompletionEditor } from "@/components/admin/content/forms/table-completion-editor";
import { CompletionLinesEditor } from "@/components/admin/content/forms/completion-lines-editor";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { gapsInCompletionLines } from "@/lib/exam/inline-content";
import { QUESTION_TYPE_LABELS } from "@/lib/admin/content/factories";
import type { QuestionGroup } from "@/lib/exam/types";

type Props = {
  group: QuestionGroup;
  testId?: string;
  answerKey: AnswerKeyMap;
  onChange: (group: QuestionGroup) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
  onRemove: () => void;
};

export function QuestionGroupEditor({
  group,
  testId,
  answerKey,
  onChange,
  onAnswerKeyChange,
  onRemove,
}: Props) {
  const typeLabel = QUESTION_TYPE_LABELS[group.type];

  return (
    <div className="rounded-xl border border-border bg-slate-50/80 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-navy">{typeLabel}</p>
          <p className="text-xs text-muted">
            Questions {group.from}
            {group.to !== group.from ? `–${group.to}` : ""}
          </p>
        </div>
        <Button variant="secondary" size="sm" className="h-8 text-red-600" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </Button>
      </div>

      <div className="mb-4 space-y-2">
        <Label className="text-xs">Instruction</Label>
        <Input
          value={group.instruction}
          onChange={(e) => onChange({ ...group, instruction: e.target.value })}
        />
        {"hint" in group && (
          <>
            <Label className="text-xs">Hint</Label>
            <Input
              value={group.hint ?? ""}
              onChange={(e) => onChange({ ...group, hint: e.target.value })}
            />
          </>
        )}
        {"title" in group && group.type !== "table_completion" && (
          <>
            <Label className="text-xs">Title</Label>
            <Input
              value={group.title ?? ""}
              onChange={(e) => onChange({ ...group, title: e.target.value })}
            />
          </>
        )}
      </div>

      {renderBody(group, testId, answerKey, onChange, onAnswerKeyChange)}
    </div>
  );
}

function renderBody(
  group: QuestionGroup,
  testId: string | undefined,
  answerKey: AnswerKeyMap,
  onChange: (g: QuestionGroup) => void,
  onAnswerKeyChange: (k: AnswerKeyMap) => void,
) {
  switch (group.type) {
    case "tfng":
    case "yng":
      return (
        <div className="space-y-3">
          {group.questions.map((q, idx) => (
            <div
              key={q.n}
              className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                {q.n}
              </span>
              <Input
                value={q.prompt}
                onChange={(e) => {
                  const questions = [...group.questions];
                  questions[idx] = { ...q, prompt: e.target.value };
                  onChange({ ...group, questions });
                }}
                placeholder="Statement"
              />
              <AnswerKeyField
                questionNumber={q.n}
                answerKey={answerKey}
                onChange={onAnswerKeyChange}
                type={group.type === "tfng" ? "tfng" : "yng"}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const n = group.to + 1;
              onChange({
                ...group,
                to: n,
                questions: [...group.questions, { n, prompt: "" }],
              });
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add statement
          </Button>
        </div>
      );

    case "mcq_single":
      return (
        <div className="space-y-4">
          {group.questions.map((q, qIdx) => (
            <div key={q.n} className="space-y-2 rounded-lg border border-border bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                  {q.n}
                </span>
                <Input
                  value={q.prompt}
                  onChange={(e) => {
                    const questions = [...group.questions];
                    questions[qIdx] = { ...q, prompt: e.target.value };
                    onChange({ ...group, questions });
                  }}
                  placeholder="Question prompt"
                />
                <AnswerKeyField
                  questionNumber={q.n}
                  answerKey={answerKey}
                  onChange={onAnswerKeyChange}
                  type="option"
                  options={q.options.map((o) => o.id)}
                />
              </div>
              {q.options.map((opt, oIdx) => (
                <div key={opt.id} className="flex items-center gap-2 pl-9">
                  <span className="w-6 text-xs font-bold text-muted">{opt.id}</span>
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const questions = [...group.questions];
                      const options = [...q.options];
                      options[oIdx] = { ...opt, label: e.target.value };
                      questions[qIdx] = { ...q, options };
                      onChange({ ...group, questions });
                    }}
                    placeholder={`Option ${opt.id}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    case "matching":
    case "matching_headings":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Options bank</Label>
            {group.options.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="w-8 text-xs font-bold">{opt.id}</span>
                <Input
                  value={opt.label}
                  onChange={(e) => {
                    const options = [...group.options];
                    options[idx] = { ...opt, label: e.target.value };
                    onChange({ ...group, options });
                  }}
                />
              </div>
            ))}
          </div>
          {group.questions.map((q, idx) => (
            <div
              key={q.n}
              className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                {q.n}
              </span>
              <Input
                value={q.prompt}
                onChange={(e) => {
                  const questions = [...group.questions];
                  questions[idx] = { ...q, prompt: e.target.value };
                  onChange({ ...group, questions });
                }}
              />
              <AnswerKeyField
                questionNumber={q.n}
                answerKey={answerKey}
                onChange={onAnswerKeyChange}
                type="option"
                options={group.options.map((o) => o.id)}
              />
            </div>
          ))}
        </div>
      );

    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "sentence_completion":
      return (
        <CompletionLinesEditor
          lines={group.lines}
          answerKey={answerKey}
          onAnswerKeyChange={onAnswerKeyChange}
          onChange={(lines) => {
            const nums = gapsInCompletionLines(lines);
            onChange({
              ...group,
              lines,
              from: nums[0] ?? group.from,
              to: nums[nums.length - 1] ?? group.to,
            });
          }}
        />
      );

    case "mcq_multi":
      return (
        <div className="space-y-3 rounded-lg border border-border bg-white p-3">
          <Input
            value={group.prompt}
            onChange={(e) => onChange({ ...group, prompt: e.target.value })}
            placeholder="Question prompt"
          />
          <Label className="text-xs">Correct answers (choose two)</Label>
          <AnswerKeyMultiField
            numbers={group.numbers}
            answerKey={answerKey}
            onChange={onAnswerKeyChange}
            options={group.options.map((o) => o.id)}
          />
          {group.options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-2">
              <span className="w-6 text-xs font-bold">{opt.id}</span>
              <Input
                value={opt.label}
                onChange={(e) => {
                  const options = [...group.options];
                  options[idx] = { ...opt, label: e.target.value };
                  onChange({ ...group, options });
                }}
              />
            </div>
          ))}
        </div>
      );

    case "short_answer":
      return (
        <div className="space-y-3">
          {group.questions.map((q, idx) => (
            <div
              key={q.n}
              className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                {q.n}
              </span>
              <Input
                value={q.prompt}
                onChange={(e) => {
                  const questions = [...group.questions];
                  questions[idx] = { ...q, prompt: e.target.value };
                  onChange({ ...group, questions });
                }}
              />
              <AnswerKeyField
                questionNumber={q.n}
                answerKey={answerKey}
                onChange={onAnswerKeyChange}
              />
            </div>
          ))}
        </div>
      );

    case "map_labeling":
      if (!testId) {
        return (
          <p className="text-xs text-muted">
            Save the test first to upload map images.
          </p>
        );
      }
      return (
        <MapLabelingEditor
          group={group}
          testId={testId}
          answerKey={answerKey}
          onChange={onChange}
          onAnswerKeyChange={onAnswerKeyChange}
        />
      );

    case "table_completion":
      return (
        <TableCompletionEditor
          group={group}
          answerKey={answerKey}
          onChange={onChange}
          onAnswerKeyChange={onAnswerKeyChange}
        />
      );

    default:
      return (
        <p className="text-xs text-muted">
          Visual editing for this question type is limited — use the Advanced JSON tab.
        </p>
      );
  }
}
