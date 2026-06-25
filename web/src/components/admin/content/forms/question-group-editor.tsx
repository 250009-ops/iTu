"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AnswerKeyField,
  AnswerKeyLetterPicker,
  AnswerKeyMultiField,
  setMcqSetAnswerKey,
} from "@/components/admin/content/forms/answer-key-field";
import { SectionLabelsInput } from "@/components/admin/content/forms/section-labels-input";
import { MapLabelingEditor } from "@/components/admin/content/forms/map-labeling-editor";
import { TableCompletionEditor } from "@/components/admin/content/forms/table-completion-editor";
import { CompletionLinesEditor } from "@/components/admin/content/forms/completion-lines-editor";
import {
  HeadingsBankEditor,
  MatchOptionsBankEditor,
  StatementListEditor,
} from "@/components/admin/content/forms/matching-editor-parts";
import { removeAnswerKeyEntry, removeQuestionAt } from "@/lib/admin/content/match-editor-helpers";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { gapsInCompletionLines } from "@/lib/exam/inline-content";
import {
  passageSectionLabels,
  DEFAULT_SECTION_LABELS,
} from "@/lib/exam/passage-sections";
import { resolveMatchingSection } from "@/lib/exam/matching-headings";
import { QUESTION_TYPE_LABELS } from "@/lib/admin/content/factories";
import type { QuestionGroup } from "@/lib/exam/types";

type Props = {
  group: QuestionGroup;
  testId?: string;
  answerKey: AnswerKeyMap;
  passageParagraphs?: { marker?: string }[];
  onChange: (group: QuestionGroup) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
  onRemove: () => void;
};

export function QuestionGroupEditor({
  group,
  testId,
  answerKey,
  passageParagraphs,
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

      {renderBody(group, testId, answerKey, passageParagraphs, onChange, onAnswerKeyChange)}
    </div>
  );
}

function renderBody(
  group: QuestionGroup,
  testId: string | undefined,
  answerKey: AnswerKeyMap,
  passageParagraphs: { marker?: string }[] | undefined,
  onChange: (g: QuestionGroup) => void,
  onAnswerKeyChange: (k: AnswerKeyMap) => void,
) {
  switch (group.type) {
    case "tfng":
    case "yng":
      return (
        <StatementListEditor
          questions={group.questions}
          answerKey={answerKey}
          answerKeyType={group.type === "tfng" ? "tfng" : "yng"}
          placeholder="Statement"
          onQuestionsChange={(questions) => onChange({ ...group, questions })}
          onAnswerKeyChange={onAnswerKeyChange}
        />
      );

    case "mcq_single":
      return (
        <div className="space-y-4">
          {group.questions.map((q, qIdx) => (
            <div key={`${q.n}-${qIdx}`} className="space-y-2 rounded-lg border border-border bg-white p-3">
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
                  disabled={group.questions.length <= 1}
                  onClick={() => {
                    const next = removeQuestionAt(group.questions, qIdx, 1);
                    if (!next) return;
                    onAnswerKeyChange(removeAnswerKeyEntry(answerKey, q.n));
                    onChange({ ...group, questions: next });
                  }}
                  aria-label={`Remove question ${q.n}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const last = group.questions[group.questions.length - 1];
              const n = (last?.n ?? group.to) + 1;
              const template = last ?? group.questions[0];
              onChange({
                ...group,
                to: n,
                questions: [
                  ...group.questions,
                  {
                    n,
                    prompt: "",
                    options: template
                      ? template.options.map((o) => ({ id: o.id, label: "" }))
                      : [
                          { id: "A", label: "" },
                          { id: "B", label: "" },
                          { id: "C", label: "" },
                          { id: "D", label: "" },
                        ],
                  },
                ],
              });
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add question
          </Button>
        </div>
      );

    case "matching_headings": {
      const sections = passageSectionLabels(passageParagraphs);
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Students drag headings onto drop zones above each section in the passage.
            Map each question to a passage section.
          </p>
          <HeadingsBankEditor
            options={group.options}
            onChange={(options) => onChange({ ...group, options })}
          />
          {group.questions.map((q, idx) => {
            const section =
              q.section?.trim() ||
              resolveMatchingSection(q, sections[idx]) ||
              sections[0] ||
              "A";
            return (
              <div
                key={q.n}
                className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                  {q.n}
                </span>
                <select
                  value={section}
                  onChange={(e) => {
                    const questions = [...group.questions];
                    const letter = e.target.value;
                    questions[idx] = {
                      ...q,
                      section: letter,
                      prompt: `Section ${letter}`,
                    };
                    onChange({ ...group, questions });
                  }}
                  className="h-9 rounded-md border border-border bg-white px-2 text-sm"
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
                <AnswerKeyField
                  questionNumber={q.n}
                  answerKey={answerKey}
                  onChange={onAnswerKeyChange}
                  type="option"
                  options={group.options.map((o) => o.id)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
                  disabled={group.questions.length <= 1}
                  onClick={() => {
                    const next = removeQuestionAt(group.questions, idx, 1);
                    if (!next) return;
                    onChange({ ...group, questions: next });
                  }}
                  aria-label={`Remove section ${q.n}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const n = group.to + 1;
                const letter = sections[group.questions.length] ?? "A";
                onChange({
                  ...group,
                  to: n,
                  questions: [
                    ...group.questions,
                    { n, prompt: `Section ${letter}`, section: letter },
                  ],
                });
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add section
            </Button>
            {sections.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onChange({
                    ...group,
                    questions: sections.map((s, i) => ({
                      n: group.from + i,
                      section: s,
                      prompt: `Section ${s}`,
                    })),
                    to: group.from + sections.length - 1,
                  });
                }}
              >
                Sync from passage markers
              </Button>
            )}
          </div>
        </div>
      );
    }

    case "matching":
      return (
        <div className="space-y-3">
          <MatchOptionsBankEditor
            options={group.options}
            onChange={(options) => onChange({ ...group, options })}
          />
          <StatementListEditor
            questions={group.questions}
            answerKey={answerKey}
            answerKeyType="option"
            answerOptions={group.options.map((o) => o.id)}
            onQuestionsChange={(questions) => onChange({ ...group, questions })}
            onAnswerKeyChange={onAnswerKeyChange}
          />
        </div>
      );

    case "matching_information": {
      const labels =
        group.sectionLabels && group.sectionLabels.length > 0
          ? group.sectionLabels
          : passageSectionLabels(passageParagraphs, undefined);
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Section labels (dropdown options)</Label>
            <SectionLabelsInput
              value={group.sectionLabels}
              onChange={(sectionLabels) =>
                onChange({
                  ...group,
                  sectionLabels,
                })
              }
              placeholder="A, B, C, D, E, F"
            />
            <p className="text-xs text-muted">
              Type comma-separated letters (e.g. A, B, C, D, E). Leave blank to
              use markers from the passage at exam time.
            </p>
          </div>
          <StatementListEditor
            questions={group.questions}
            answerKey={answerKey}
            answerKeyType="option"
            answerOptions={labels.length > 0 ? labels : DEFAULT_SECTION_LABELS}
            placeholder="Statement to match to a section"
            onQuestionsChange={(questions) => onChange({ ...group, questions })}
            onAnswerKeyChange={onAnswerKeyChange}
          />
        </div>
      );
    }

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

    case "summary_completion_list":
      return (
        <div className="space-y-3 rounded-lg border border-border bg-white p-3">
          <div className="space-y-2">
            <Label className="text-xs">Summary title</Label>
            <Input
              value={group.title ?? ""}
              onChange={(e) => onChange({ ...group, title: e.target.value })}
              placeholder="e.g. Mozart"
            />
          </div>
          <MatchOptionsBankEditor
            label="Word bank (A, B, C…)"
            options={group.options}
            minOptions={2}
            onChange={(options) => onChange({ ...group, options })}
          />
          <CompletionLinesEditor
            lines={group.lines}
            answerKey={answerKey}
            onAnswerKeyChange={onAnswerKeyChange}
            gapAnswerKeyType="option"
            gapAnswerKeyOptions={group.options.map((o) => o.id)}
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
        </div>
      );

    case "mcq_multi": {
      if (group.type !== "mcq_multi") return null;
      const mcq = group;
      const selectionMode = mcq.selectionMode ?? "shared";
      const isPerQuestion = selectionMode === "per_question";
      const answerOrdering = mcq.answerOrdering ?? "any";
      const isAnyOrder = answerOrdering === "any";
      const optionIds = mcq.options.map((o) => o.id);

      function resizeNumbers(count: number) {
        const nums = [...mcq.numbers];
        while (nums.length < count) {
          nums.push((nums[nums.length - 1] ?? mcq.from - 1) + 1);
        }
        while (nums.length > count && nums.length > 1) nums.pop();
        return nums;
      }

      return (
        <div className="space-y-3 rounded-lg border border-border bg-white p-3">
          <div className="space-y-2">
            <Label className="text-xs">Answer format</Label>
            <select
              value={selectionMode}
              onChange={(e) => {
                const mode = e.target.value as "shared" | "per_question";
                if (mode === "per_question") {
                  const nums = resizeNumbers(Math.max(mcq.numbers.length, 4));
                  onChange({
                    ...mcq,
                    selectionMode: mode,
                    answerOrdering: "any",
                    numbers: nums,
                    maxSelections: nums.length,
                    to: nums[nums.length - 1] ?? mcq.to,
                    hint: `Choose the correct letter, ${optionIds[0] ?? "A"}–${optionIds[optionIds.length - 1] ?? "G"}. Write one letter in each box.`,
                  });
                } else {
                  onChange({
                    ...mcq,
                    selectionMode: mode,
                    maxSelections: 2,
                    numbers: resizeNumbers(2),
                    to: mcq.from + 1,
                    hint: "Choose TWO letters.",
                  });
                }
              }}
              className="h-9 w-full max-w-md rounded-md border border-border bg-white px-2 text-sm"
            >
              <option value="shared">Choose N answers together (e.g. Which TWO?)</option>
              <option value="per_question">One letter per answer box (e.g. Questions 1–4)</option>
            </select>
          </div>

          <Input
            value={mcq.prompt}
            onChange={(e) => onChange({ ...mcq, prompt: e.target.value })}
            placeholder="Question prompt"
          />

          <MatchOptionsBankEditor
            label="Options (A, B, C…)"
            options={mcq.options}
            minOptions={2}
            onChange={(options) => onChange({ ...mcq, options })}
          />

          {isPerQuestion ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Correct answer assignment</Label>
                <select
                  value={answerOrdering}
                  onChange={(e) => {
                    const ordering = e.target.value as "fixed" | "any";
                    const nextKey =
                      ordering === "any"
                        ? setMcqSetAnswerKey(answerKey, mcq.numbers, [])
                        : (() => {
                            const from = mcq.numbers[0];
                            const to = mcq.numbers[mcq.numbers.length - 1];
                            if (from == null || to == null) return answerKey;
                            const next = { ...answerKey };
                            delete next[`$set$${from}-${to}`];
                            return next;
                          })();
                    onAnswerKeyChange(nextKey);
                    onChange({ ...mcq, answerOrdering: ordering });
                  }}
                  className="h-9 w-full max-w-md rounded-md border border-border bg-white px-2 text-sm"
                >
                  <option value="any">
                    Correct letter set — any box order (recommended for paper Q1–4)
                  </option>
                  <option value="fixed">Specific letter per answer box</option>
                </select>
                <p className="text-xs text-muted">
                  {isAnyOrder
                    ? "Pick the correct letters below. Students may write them in any order in boxes 1–4."
                    : "Assign one specific correct letter to each numbered box."}
                </p>
              </div>

              {isAnyOrder ? (
                <>
                  <Label className="text-xs">
                    Correct letters ({mcq.numbers.length} required)
                  </Label>
                  <AnswerKeyMultiField
                    numbers={mcq.numbers}
                    answerKey={answerKey}
                    onChange={onAnswerKeyChange}
                    options={optionIds}
                    maxSelections={mcq.numbers.length}
                    setKeyMode
                  />
                </>
              ) : (
                <>
                  <Label className="text-xs">Answer boxes (click the correct letter)</Label>
                  {mcq.numbers.map((n, idx) => (
                    <div
                      key={n}
                      className="space-y-2 rounded-lg border border-border bg-slate-50/80 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                          {n}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
                          disabled={mcq.numbers.length <= 1}
                          onClick={() => {
                            const nums = mcq.numbers.filter((_, i) => i !== idx);
                            if (nums.length === 0) return;
                            onAnswerKeyChange(removeAnswerKeyEntry(answerKey, n));
                            onChange({
                              ...mcq,
                              numbers: nums,
                              maxSelections: nums.length,
                              to: nums[nums.length - 1] ?? mcq.from,
                            });
                          }}
                          aria-label={`Remove answer box ${n}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <AnswerKeyLetterPicker
                        questionNumber={n}
                        answerKey={answerKey}
                        onChange={onAnswerKeyChange}
                        options={mcq.options}
                      />
                    </div>
                  ))}
                </>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const nums = resizeNumbers(mcq.numbers.length + 1);
                  onChange({
                    ...mcq,
                    numbers: nums,
                    maxSelections: nums.length,
                    to: nums[nums.length - 1] ?? mcq.to,
                  });
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add answer box
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Number of answers to choose</Label>
                <Input
                  type="number"
                  min={2}
                  max={Math.max(2, mcq.options.length)}
                  value={mcq.maxSelections}
                  onChange={(e) => {
                    const count = Math.max(
                      2,
                      Math.min(mcq.options.length, Number(e.target.value) || 2),
                    );
                    const nums = resizeNumbers(count);
                    onChange({
                      ...mcq,
                      maxSelections: count,
                      numbers: nums,
                      to: nums[nums.length - 1] ?? mcq.to,
                    });
                  }}
                  className="max-w-[8rem]"
                />
              </div>
              <Label className="text-xs">
                Correct answers (choose {mcq.maxSelections})
              </Label>
              <AnswerKeyMultiField
                numbers={mcq.numbers}
                answerKey={answerKey}
                onChange={onAnswerKeyChange}
                options={optionIds}
                maxSelections={mcq.maxSelections}
              />
            </>
          )}
        </div>
      );
    }

    case "short_answer":
      return (
        <StatementListEditor
          questions={group.questions}
          answerKey={answerKey}
          answerKeyType="text"
          onQuestionsChange={(questions) => onChange({ ...group, questions })}
          onAnswerKeyChange={onAnswerKeyChange}
        />
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

    case "flowchart_completion":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Flow-chart title</Label>
            <Input
              value={group.title ?? ""}
              onChange={(e) => onChange({ ...group, title: e.target.value })}
            />
          </div>
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
          <div className="space-y-2">
            <Label className="text-xs">Flow nodes (top to bottom)</Label>
            {group.nodes.map((node, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-3"
              >
                <select
                  value={node.kind}
                  onChange={(e) => {
                    const nodes = [...group.nodes];
                    nodes[idx] =
                      e.target.value === "text"
                        ? { kind: "text", text: "" }
                        : { kind: "gap", n: group.from + idx };
                    onChange({ ...group, nodes });
                  }}
                  className="h-9 rounded-md border border-border px-2 text-sm"
                >
                  <option value="text">Fixed text</option>
                  <option value="gap">Gap (question)</option>
                </select>
                {node.kind === "text" ? (
                  <Input
                    value={node.text}
                    onChange={(e) => {
                      const nodes = [...group.nodes];
                      nodes[idx] = { kind: "text", text: e.target.value };
                      onChange({ ...group, nodes });
                    }}
                    placeholder="Step label"
                    className="flex-1"
                  />
                ) : (
                  <>
                    <span className="text-xs font-bold text-navy">Q{node.n}</span>
                    <AnswerKeyField
                      questionNumber={node.n}
                      answerKey={answerKey}
                      onChange={onAnswerKeyChange}
                      type="option"
                      options={group.options.map((o) => o.id)}
                    />
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-red-600"
                  onClick={() =>
                    onChange({
                      ...group,
                      nodes: group.nodes.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onChange({
                    ...group,
                    nodes: [...group.nodes, { kind: "text", text: "" }],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add text step
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const n = group.to + 1;
                  onChange({
                    ...group,
                    to: n,
                    nodes: [...group.nodes, { kind: "gap", n }],
                  });
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add gap
              </Button>
            </div>
          </div>
        </div>
      );

    case "instruction_screen":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Instruction body</Label>
            <textarea
              value={group.body}
              onChange={(e) => onChange({ ...group, body: e.target.value })}
              rows={6}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              placeholder="Multi-line instructions shown before questions…"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Continue button label</Label>
            <Input
              value={group.buttonLabel ?? "Next"}
              onChange={(e) => onChange({ ...group, buttonLabel: e.target.value })}
            />
          </div>
        </div>
      );

    case "matching_features":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Feature list title</Label>
            <Input
              value={group.listTitle ?? ""}
              onChange={(e) => onChange({ ...group, listTitle: e.target.value })}
              placeholder="List of researchers"
            />
          </div>
          <MatchOptionsBankEditor
            label="Features / people"
            options={group.options}
            minOptions={2}
            onChange={(options) => onChange({ ...group, options })}
          />
          <StatementListEditor
            questions={group.questions}
            answerKey={answerKey}
            answerKeyType="option"
            answerOptions={group.options.map((o) => o.id)}
            onQuestionsChange={(questions) => onChange({ ...group, questions })}
            onAnswerKeyChange={onAnswerKeyChange}
          />
        </div>
      );

    default:
      return (
        <p className="text-xs text-muted">
          Visual editing for this question type is limited in Content Studio.
        </p>
      );
  }
}
