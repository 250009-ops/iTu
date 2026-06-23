"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AnswerKeyField,
} from "@/components/admin/content/forms/answer-key-field";
import {
  nextMatchOptionId,
  removeAnswerKeyEntry,
  removeQuestionAt,
} from "@/lib/admin/content/match-editor-helpers";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { MatchOption } from "@/lib/exam/types";

type OptionsBankProps = {
  label?: string;
  options: MatchOption[];
  minOptions?: number;
  onChange: (options: MatchOption[]) => void;
};

export function MatchOptionsBankEditor({
  label = "Options bank",
  options,
  minOptions = 2,
  onChange,
}: OptionsBankProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {options.map((opt, idx) => (
        <div key={opt.id} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-xs font-bold">{opt.id}</span>
          <Input
            value={opt.label}
            onChange={(e) => {
              const next = [...options];
              next[idx] = { ...opt, label: e.target.value };
              onChange(next);
            }}
            placeholder={`Option ${opt.id}`}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
            disabled={options.length <= minOptions}
            onClick={() => onChange(options.filter((_, i) => i !== idx))}
            aria-label={`Remove option ${opt.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const id = nextMatchOptionId(options);
          onChange([...options, { id, label: `Option ${id}` }]);
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add option
      </Button>
    </div>
  );
}

type StatementListProps = {
  questions: { n: number; prompt: string }[];
  answerKey: AnswerKeyMap;
  answerKeyType?: "text" | "tfng" | "yng" | "option";
  answerOptions?: string[];
  placeholder?: string;
  minStatements?: number;
  onQuestionsChange: (questions: { n: number; prompt: string }[]) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
};

export function StatementListEditor({
  questions,
  answerKey,
  answerKeyType = "option",
  answerOptions,
  placeholder = "Statement",
  minStatements = 1,
  onQuestionsChange,
  onAnswerKeyChange,
}: StatementListProps) {
  function removeStatement(idx: number) {
    const next = removeQuestionAt(questions, idx, minStatements);
    if (!next) return;
    onQuestionsChange(next);
  }

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => (
        <div
          key={`${q.n}-${idx}`}
          className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
            {q.n}
          </span>
          <Input
            value={q.prompt}
            onChange={(e) => {
              const next = [...questions];
              next[idx] = { ...q, prompt: e.target.value };
              onQuestionsChange(next);
            }}
            placeholder={placeholder}
          />
          <AnswerKeyField
            questionNumber={q.n}
            answerKey={answerKey}
            onChange={onAnswerKeyChange}
            type={answerKeyType}
            options={answerOptions}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
            disabled={questions.length <= minStatements}
            onClick={() => removeStatement(idx)}
            aria-label={`Remove statement ${q.n}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const n = questions[questions.length - 1]?.n ?? 0;
          onQuestionsChange([...questions, { n: n + 1, prompt: "" }]);
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add statement
      </Button>
    </div>
  );
}
