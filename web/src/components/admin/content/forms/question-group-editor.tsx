"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AnswerKeyField,
  AnswerKeyLetterPicker,
  AnswerKeyMultiField,
  readMcqSetAnswerKey,
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
import { removeAnswerKeyEntry, removeQuestionAt, nextMatchOptionId } from "@/lib/admin/content/match-editor-helpers";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { gapsInCompletionLines } from "@/lib/exam/inline-content";
import {
  passageSectionLabels,
  DEFAULT_SECTION_LABELS,
} from "@/lib/exam/passage-sections";
import {
  defaultMatchingHeadingsInstruction,
  isAutoMatchingHeadingsInstruction,
  normalizeMatchingHeadingsGroup,
  resolveMatchingSection,
} from "@/lib/exam/matching-headings";
import {
  patchMatchingInformationGroup,
  syncMatchingInformationGroupsFromPassage,
} from "@/lib/exam/matching-information";
import {
  inferMatchingReuseOptions,
  matchingHintWithReuse,
} from "@/lib/exam/matching-options";
import { QUESTION_TYPE_LABELS } from "@/lib/admin/content/factories";
import type { FlowchartCompletionGroup, MatchingFeaturesGroup, MatchingGroup, MatchingInformationGroup, McqSingleGroup, QuestionGroup } from "@/lib/exam/types";

type Props = {
  group: QuestionGroup;
  testId?: string;
  answerKey: AnswerKeyMap;
  passageParagraphs?: { marker?: string }[];
  onChange: (group: QuestionGroup) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
  onRemove: () => void;
};

function patchMatchingHeadingsGroup(
  group: MatchingGroup,
  patch: Partial<MatchingGroup>,
  passageParagraphs: { marker?: string }[] | undefined,
): MatchingGroup {
  const sections = passageSectionLabels(passageParagraphs);
  const merged = normalizeMatchingHeadingsGroup({ ...group, ...patch });
  const instruction = isAutoMatchingHeadingsInstruction(merged.instruction)
    ? defaultMatchingHeadingsInstruction(sections)
    : merged.instruction;
  const questions = merged.questions;
  return {
    ...merged,
    instruction,
    from: questions[0]?.n ?? merged.from,
    to: questions.length ? questions[questions.length - 1]!.n : merged.from,
  };
}

function usedMatchingSections(
  group: MatchingGroup,
  includeExample = true,
): Set<string> {
  const used = new Set(
    group.questions
      .map((q) => resolveMatchingSection(q).toUpperCase())
      .filter(Boolean),
  );
  if (includeExample && group.example?.section) {
    used.add(group.example.section.toUpperCase());
  }
  return used;
}

function MatchingReuseOptionsField({
  group,
  onChange,
}: {
  group: { reuseOptions?: boolean; hint?: string };
  onChange: (patch: { reuseOptions: boolean; hint: string }) => void;
}) {
  const reuse = inferMatchingReuseOptions(group);
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={reuse}
          onChange={(e) => {
            const reuseOptions = e.target.checked;
            onChange({
              reuseOptions,
              hint: matchingHintWithReuse(group.hint ?? "", reuseOptions),
            });
          }}
          className="mt-0.5 rounded border-border"
        />
        <span>
          <span className="text-sm font-medium text-navy">
            Allow reusing the same letter (NB)
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            When checked, the hint adds &quot;NB You may use any letter more than
            once&quot; and students can assign the same letter to multiple questions.
            When unchecked, each letter can only be used once.
          </span>
        </span>
      </label>
    </div>
  );
}

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

    case "mcq_single": {
      const mcqGroup = group as McqSingleGroup;

      function commit(patch: Partial<McqSingleGroup>) {
        onChange({ ...mcqGroup, ...patch });
      }

      function defaultExampleOptions() {
        const template = mcqGroup.questions[0]?.options;
        if (template?.length) {
          return template.map((o) => ({ id: o.id, label: "" }));
        }
        return [
          { id: "A", label: "" },
          { id: "B", label: "" },
          { id: "C", label: "" },
        ];
      }

      return (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Optionally show one pre-filled example question — it does not use a question
            number and is not scored (Cambridge-style).
          </p>

          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-amber-950">
              <input
                type="checkbox"
                checked={Boolean(mcqGroup.example)}
                onChange={(e) => {
                  if (!e.target.checked) {
                    commit({ example: undefined });
                    return;
                  }
                  const options = defaultExampleOptions();
                  commit({
                    example: {
                      prompt: "",
                      options,
                      answerId: options[options.length - 1]?.id ?? "C",
                    },
                  });
                }}
                className="rounded border-border"
              />
              Example question (pre-filled, not scored)
            </label>
            {mcqGroup.example && (
              <div className="space-y-2">
                <Input
                  value={mcqGroup.example.prompt}
                  onChange={(e) =>
                    commit({
                      example: { ...mcqGroup.example!, prompt: e.target.value },
                    })
                  }
                  placeholder="Example question prompt"
                />
                {mcqGroup.example.options.map((opt, oIdx) => (
                  <div key={opt.id} className="flex items-center gap-2 pl-2">
                    <span className="w-6 shrink-0 text-xs font-bold text-muted">{opt.id}</span>
                    <Input
                      value={opt.label}
                      onChange={(e) => {
                        const options = [...mcqGroup.example!.options];
                        options[oIdx] = { ...opt, label: e.target.value };
                        commit({ example: { ...mcqGroup.example!, options } });
                      }}
                      placeholder={`Option ${opt.id}`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
                      disabled={mcqGroup.example!.options.length <= 2}
                      onClick={() => {
                        const options = mcqGroup.example!.options.filter((_, i) => i !== oIdx);
                        let answerId = mcqGroup.example!.answerId;
                        if (answerId === opt.id) {
                          answerId = options[0]?.id ?? "";
                        }
                        commit({ example: { ...mcqGroup.example!, options, answerId } });
                      }}
                      aria-label={`Remove example option ${opt.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2 pl-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      const id = nextMatchOptionId(mcqGroup.example!.options);
                      const options = [...mcqGroup.example!.options, { id, label: "" }];
                      commit({ example: { ...mcqGroup.example!, options } });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </Button>
                  <label className="flex items-center gap-2 text-xs text-amber-950">
                    <span className="font-medium">Correct answer</span>
                    <select
                      value={mcqGroup.example.answerId}
                      onChange={(e) =>
                        commit({
                          example: { ...mcqGroup.example!, answerId: e.target.value },
                        })
                      }
                      className="h-8 rounded-md border border-border bg-white px-2 text-sm"
                    >
                      {mcqGroup.example.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>

          {mcqGroup.questions.map((q, qIdx) => (
            <div key={`${q.n}-${qIdx}`} className="space-y-2 rounded-lg border border-border bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                  {q.n}
                </span>
                <Input
                  value={q.prompt}
                  onChange={(e) => {
                    const questions = [...mcqGroup.questions];
                    questions[qIdx] = { ...q, prompt: e.target.value };
                    commit({ questions });
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
                  disabled={mcqGroup.questions.length <= 1}
                  onClick={() => {
                    const next = removeQuestionAt(mcqGroup.questions, qIdx, 1);
                    if (!next) return;
                    onAnswerKeyChange(removeAnswerKeyEntry(answerKey, q.n));
                    commit({ questions: next });
                  }}
                  aria-label={`Remove question ${q.n}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {q.options.map((opt, oIdx) => (
                <div key={opt.id} className="flex items-center gap-2 pl-9">
                  <span className="w-6 shrink-0 text-xs font-bold text-muted">{opt.id}</span>
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const questions = [...mcqGroup.questions];
                      const options = [...q.options];
                      options[oIdx] = { ...opt, label: e.target.value };
                      questions[qIdx] = { ...q, options };
                      commit({ questions });
                    }}
                    placeholder={`Option ${opt.id}`}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
                    disabled={q.options.length <= 2}
                    onClick={() => {
                      const options = q.options.filter((_, i) => i !== oIdx);
                      const questions = [...mcqGroup.questions];
                      questions[qIdx] = { ...q, options };
                      if (answerKey[String(q.n)] === opt.id) {
                        onAnswerKeyChange(removeAnswerKeyEntry(answerKey, q.n));
                      }
                      commit({ questions });
                    }}
                    aria-label={`Remove option ${opt.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="pl-9">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const id = nextMatchOptionId(q.options);
                    const questions = [...mcqGroup.questions];
                    questions[qIdx] = {
                      ...q,
                      options: [...q.options, { id, label: "" }],
                    };
                    commit({ questions });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add option
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const last = mcqGroup.questions[mcqGroup.questions.length - 1];
              const n = (last?.n ?? mcqGroup.to) + 1;
              const template = last ?? mcqGroup.questions[0];
              commit({
                to: n,
                questions: [
                  ...mcqGroup.questions,
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
    }

    case "matching_headings": {
      const mhGroup = normalizeMatchingHeadingsGroup(group as MatchingGroup);
      const sections = passageSectionLabels(passageParagraphs);

      function commit(patch: Partial<MatchingGroup>) {
        onChange(patchMatchingHeadingsGroup(mhGroup, patch, passageParagraphs));
      }

      function commitQuestions(questions: MatchingGroup["questions"]) {
        commit({ questions });
      }

      return (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Students drag headings onto drop zones above each section in the passage.
            Optionally show one pre-filled example section — it does not use a question
            number and is not scored.
          </p>
          <HeadingsBankEditor
            options={mhGroup.options}
            onChange={(options) => commit({ options })}
          />

          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-amber-950">
              <input
                type="checkbox"
                checked={Boolean(mhGroup.example)}
                onChange={(e) => {
                  if (!e.target.checked) {
                    commit({ example: undefined });
                    return;
                  }
                  const section = sections[0] ?? "A";
                  const headingId = mhGroup.options[0]?.id ?? "i";
                  const questions = mhGroup.questions.filter(
                    (q) => resolveMatchingSection(q).toUpperCase() !== section.toUpperCase(),
                  );
                  commit({
                    example: { section: section.toUpperCase(), headingId },
                    questions,
                  });
                }}
                className="rounded border-border"
              />
              Example section (pre-filled, not scored)
            </label>
            {mhGroup.example && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={mhGroup.example.section}
                  onChange={(e) => {
                    const section = e.target.value.toUpperCase();
                    const questions = mhGroup.questions.filter(
                      (q) => resolveMatchingSection(q).toUpperCase() !== section,
                    );
                    commit({
                      example: { ...mhGroup.example!, section },
                      questions,
                    });
                  }}
                  className="h-9 rounded-md border border-border bg-white px-2 text-sm"
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
                <select
                  value={mhGroup.example.headingId}
                  onChange={(e) =>
                    commit({
                      example: { ...mhGroup.example!, headingId: e.target.value },
                    })
                  }
                  className="h-9 min-w-[10rem] rounded-md border border-border bg-white px-2 text-sm"
                >
                  {mhGroup.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {mhGroup.questions.map((q, idx) => {
            const used = usedMatchingSections(mhGroup, true);
            const section =
              q.section?.trim().toUpperCase() ||
              resolveMatchingSection(q, sections[idx]) ||
              sections.find((s) => !used.has(s)) ||
              sections[0] ||
              "A";
            return (
              <div
                key={`${q.n}-${idx}`}
                className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
                  {q.n}
                </span>
                <select
                  value={section}
                  onChange={(e) => {
                    const questions = [...mhGroup.questions];
                    const letter = e.target.value.toUpperCase();
                    questions[idx] = {
                      ...q,
                      section: letter,
                      prompt: `Section ${letter}`,
                    };
                    commitQuestions(questions);
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
                  options={mhGroup.options.map((o) => o.id)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-red-600 disabled:opacity-40"
                  disabled={mhGroup.questions.length <= 1}
                  onClick={() => {
                    const next = removeQuestionAt(mhGroup.questions, idx, 1);
                    if (!next) return;
                    commitQuestions(next);
                  }}
                  aria-label={`Remove question ${q.n}`}
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
                const used = usedMatchingSections(mhGroup, true);
                const letter = sections.find((s) => !used.has(s.toUpperCase()));
                if (!letter) return;
                const n = mhGroup.to + 1;
                commitQuestions([
                  ...mhGroup.questions,
                  {
                    n,
                    prompt: `Section ${letter}`,
                    section: letter.toUpperCase(),
                  },
                ]);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add section
            </Button>
            {sections.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const exampleSection = mhGroup.example?.section?.toUpperCase();
                  const scoredSections = sections.filter(
                    (s) => s.toUpperCase() !== exampleSection,
                  );
                  commitQuestions(
                    scoredSections.map((s, i) => ({
                      n: mhGroup.from + i,
                      section: s.toUpperCase(),
                      prompt: `Section ${s}`,
                    })),
                  );
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
          <MatchingReuseOptionsField
            group={group}
            onChange={(patch) => onChange({ ...group, ...patch })}
          />
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
      const miGroup = group as MatchingInformationGroup;
      const labels =
        miGroup.sectionLabels && miGroup.sectionLabels.length > 0
          ? miGroup.sectionLabels
          : passageSectionLabels(passageParagraphs, undefined);
      const commitMatchingInformation = (
        patch: Partial<MatchingInformationGroup>,
      ) => {
        onChange(
          patchMatchingInformationGroup(miGroup, patch, passageParagraphs),
        );
      };
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Section labels (dropdown options)</Label>
            <SectionLabelsInput
              value={miGroup.sectionLabels}
              onChange={(sectionLabels) =>
                commitMatchingInformation({ sectionLabels })
              }
              placeholder="A, B, C, D, E, F"
            />
            <p className="text-xs text-muted">
              Type comma-separated letters (e.g. A, B, C, D, E). Leave blank to
              use markers from the passage at exam time.
            </p>
          </div>
          <StatementListEditor
            questions={miGroup.questions}
            answerKey={answerKey}
            answerKeyType="option"
            answerOptions={labels.length > 0 ? labels : DEFAULT_SECTION_LABELS}
            placeholder="Statement to match to a section"
            onQuestionsChange={(questions) =>
              commitMatchingInformation({ questions })
            }
            onAnswerKeyChange={onAnswerKeyChange}
          />
          {passageParagraphs && passageParagraphs.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onChange(
                  syncMatchingInformationGroupsFromPassage(
                    [miGroup],
                    passageParagraphs,
                  )[0] as MatchingInformationGroup,
                );
              }}
            >
              Sync from passage markers
            </Button>
          )}
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
                            if (isAnyOrder) {
                              const letters = readMcqSetAnswerKey(answerKey, mcq.numbers);
                              onAnswerKeyChange(setMcqSetAnswerKey(answerKey, nums, letters));
                            } else {
                              onAnswerKeyChange(removeAnswerKeyEntry(answerKey, n));
                            }
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
                  const letters = isAnyOrder
                    ? readMcqSetAnswerKey(answerKey, mcq.numbers)
                    : [];
                  if (isAnyOrder) {
                    onAnswerKeyChange(setMcqSetAnswerKey(answerKey, nums, letters));
                  }
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

    case "flowchart_completion": {
      const fcGroup = group as FlowchartCompletionGroup;
      const answerMode = fcGroup.answerMode ?? "option";
      const isTextMode = answerMode === "text";
      const steps = fcGroup.steps ?? [];

      function setAnswerMode(mode: "option" | "text") {
        onChange({
          ...fcGroup,
          answerMode: mode,
          hint:
            mode === "text"
              ? "Write the correct word or phrase for each step."
              : "Choose answers from the box and write the correct letter next to questions.",
        });
      }

      function syncRangeFromSteps(nextSteps: typeof steps) {
        const nums = gapsInCompletionLines(nextSteps);
        if (nums.length === 0) return fcGroup;
        return {
          ...fcGroup,
          steps: nextSteps,
          from: nums[0]!,
          to: nums[nums.length - 1]!,
        };
      }

      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Flow-chart title</Label>
            <Input
              value={fcGroup.title ?? ""}
              onChange={(e) => onChange({ ...fcGroup, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">How candidates answer</Label>
            <select
              value={answerMode}
              onChange={(e) => setAnswerMode(e.target.value as "option" | "text")}
              className="h-9 w-full max-w-md rounded-md border border-border bg-white px-2 text-sm"
            >
              <option value="option">Choose from options bank (A, B, C…)</option>
              <option value="text">Write the answer (words or numbers)</option>
            </select>
            <p className="text-xs text-muted">
              {isTextMode
                ? "Use when students type answers from the passage or audio (no letter bank)."
                : "Use when students pick a letter from the options box for each gap."}
            </p>
          </div>

          {!isTextMode && (
            <MatchOptionsBankEditor
              options={fcGroup.options}
              onChange={(options) => onChange({ ...fcGroup, options })}
            />
          )}

          <div className="space-y-2">
            <Label className="text-xs">Flow-chart steps (top to bottom)</Label>
            <p className="text-xs text-muted">
              Each step is one box in the chart. Add text before and after a gap
              on the same step — e.g. &ldquo;Chocolate beans are&rdquo; + gap +
              &ldquo;and then bags are shipped.&rdquo;
            </p>
            <CompletionLinesEditor
              lines={steps}
              answerKey={answerKey}
              onChange={(nextSteps) => onChange(syncRangeFromSteps(nextSteps))}
              onAnswerKeyChange={onAnswerKeyChange}
              gapAnswerKeyType={isTextMode ? "text" : "option"}
              gapAnswerKeyOptions={fcGroup.options.map((o) => o.id)}
            />
          </div>
        </div>
      );
    }

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
          <MatchingReuseOptionsField
            group={group}
            onChange={(patch) => onChange({ ...group, ...patch })}
          />
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
