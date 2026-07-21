"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SpeakingContent, SpeakingPart1Topic } from "@/lib/exam/types";
import { emptySpeakingTopic } from "@/lib/speaking/content";
import { cn } from "@/lib/utils";

type Props = {
  content: SpeakingContent;
  onContentChange: (content: SpeakingContent) => void;
  layout?: "pane" | "flow";
};

function QuestionListEditor({
  label,
  hint,
  questions,
  onChange,
}: {
  label: string;
  hint: string;
  questions: string[];
  onChange: (questions: string[]) => void;
}) {
  const items = questions.length > 0 ? questions : [""];

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs font-semibold text-navy">{label}</Label>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {items.map((q, idx) => (
        <div key={idx} className="flex gap-2">
          <span className="flex h-10 w-7 shrink-0 items-center justify-center text-xs font-bold text-muted">
            {idx + 1}
          </span>
          <Input
            value={q}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange(next);
            }}
            placeholder={`Question ${idx + 1}`}
          />
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 text-red-600"
            onClick={() => {
              const next = items.filter((_, i) => i !== idx);
              onChange(next.length ? next : [""]);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, ""])}>
        <Plus className="h-3.5 w-3.5" /> Add question
      </Button>
    </div>
  );
}

function SpeakingTopicsEditor({
  topics,
  onChange,
  tone,
}: {
  topics: SpeakingPart1Topic[];
  onChange: (topics: SpeakingPart1Topic[]) => void;
  tone: "sky" | "violet";
}) {
  const items = topics.length > 0 ? topics : [emptySpeakingTopic()];
  const badgeClass =
    tone === "sky"
      ? "bg-sky-100 text-sky-700"
      : "bg-violet-100 text-violet-700";
  const borderClass =
    tone === "sky" ? "border-sky-100" : "border-violet-100";

  function updateTopic(index: number, patch: Partial<SpeakingPart1Topic>) {
    const next = [...items];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function updateQuestion(topicIndex: number, questionIndex: number, value: string) {
    const next = [...items];
    const questions = [...(next[topicIndex]?.questions ?? [""])];
    questions[questionIndex] = value;
    next[topicIndex] = { ...next[topicIndex]!, questions };
    onChange(next);
  }

  function addQuestion(topicIndex: number) {
    const next = [...items];
    const questions = [...(next[topicIndex]?.questions ?? [""]), ""];
    next[topicIndex] = { ...next[topicIndex]!, questions };
    onChange(next);
  }

  function removeQuestion(topicIndex: number, questionIndex: number) {
    const next = [...items];
    const questions = (next[topicIndex]?.questions ?? [""]).filter(
      (_, i) => i !== questionIndex,
    );
    next[topicIndex] = {
      ...next[topicIndex]!,
      questions: questions.length ? questions : [""],
    };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {items.map((topic, topicIndex) => (
        <div
          key={topicIndex}
          className={cn("rounded-lg border bg-white p-4 shadow-sm", borderClass)}
        >
          <div className="mb-3 flex items-start gap-2">
            <span
              className={cn(
                "mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                badgeClass,
              )}
            >
              {topicIndex + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <Label className="text-xs">Topic title</Label>
              <Input
                value={topic.title}
                onChange={(e) => updateTopic(topicIndex, { title: e.target.value })}
                placeholder="e.g. Home / accommodation"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-6 shrink-0 text-red-600"
              onClick={() => {
                const next = items.filter((_, i) => i !== topicIndex);
                onChange(next.length ? next : [emptySpeakingTopic()]);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-2 pl-9">
            {(topic.questions.length > 0 ? topic.questions : [""]).map(
              (question, questionIndex) => (
                <div key={questionIndex} className="flex gap-2">
                  <span className="flex h-10 w-6 shrink-0 items-center justify-center text-[11px] font-bold text-muted">
                    Q{questionIndex + 1}
                  </span>
                  <Input
                    value={question}
                    onChange={(e) =>
                      updateQuestion(topicIndex, questionIndex, e.target.value)
                    }
                    placeholder={`Question ${questionIndex + 1}`}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0 text-red-600"
                    onClick={() => removeQuestion(topicIndex, questionIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addQuestion(topicIndex)}
            >
              <Plus className="h-3.5 w-3.5" /> Add question
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange([...items, emptySpeakingTopic()])}
      >
        <Plus className="h-3.5 w-3.5" /> Add topic
      </Button>
    </div>
  );
}

export function SpeakingVisualEditor({
  content,
  onContentChange,
  layout = "pane",
}: Props) {
  const parts = content.parts ?? [];
  const cueCard = content.cueCard ?? {
    title: "",
    bullets: [""],
    prepSeconds: 60,
    speakSeconds: 120,
  };
  const bullets = cueCard.bullets ?? [""];

  function updatePart(index: number, patch: Partial<(typeof parts)[0]>) {
    const nextParts = [...parts];
    nextParts[index] = { ...nextParts[index], ...patch };
    onContentChange({ ...content, parts: nextParts });
  }

  function updateCueCard(patch: Partial<SpeakingContent["cueCard"]>) {
    onContentChange({
      ...content,
      cueCard: { ...cueCard, ...patch },
    });
  }

  return (
    <div
      className={cn(
        layout === "flow" ? "space-y-6" : "min-h-0 flex-1 space-y-6 overflow-y-auto",
      )}
    >
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy">Speaking parts (student sees titles only)</h3>
        {parts.map((part, idx) => (
          <div key={part.part} className="rounded-xl border border-border bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
              Part {part.part}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Title</Label>
                <Input
                  value={part.title}
                  onChange={(e) => updatePart(idx, { title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Duration (seconds)</Label>
                <Input
                  type="number"
                  min={60}
                  value={part.durationSec}
                  onChange={(e) => updatePart(idx, { durationSec: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Guidance (minimal status text for student)</Label>
                <Input
                  value={part.guidance}
                  onChange={(e) => updatePart(idx, { guidance: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4">
        <div className="mb-4">
          <Label className="text-xs font-semibold text-navy">
            Part 1 — Interviewer topics &amp; questions
          </Label>
          <p className="text-xs text-muted">
            Examiner-only. Group questions by topic for the live console — not
            visible to the student.
          </p>
        </div>
        <SpeakingTopicsEditor
          tone="sky"
          topics={content.part1Topics ?? [emptySpeakingTopic()]}
          onChange={(part1Topics) =>
            onContentChange({ ...content, part1Topics, part1Questions: undefined })
          }
        />
      </div>

      <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
        <h3 className="text-sm font-semibold text-navy">Part 2 cue card (released to student)</h3>
        <div className="space-y-2">
          <Label className="text-xs">Topic title</Label>
          <Input
            value={cueCard.title}
            onChange={(e) => updateCueCard({ title: e.target.value })}
            placeholder="Describe a book you read recently…"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Preparation (seconds)</Label>
            <Input
              type="number"
              value={cueCard.prepSeconds}
              onChange={(e) => updateCueCard({ prepSeconds: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Speaking time (seconds)</Label>
            <Input
              type="number"
              value={cueCard.speakSeconds}
              onChange={(e) => updateCueCard({ speakSeconds: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Bullet prompts (You should say…)</Label>
          {bullets.map((bullet, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={bullet}
                onChange={(e) => {
                  const nextBullets = [...bullets];
                  nextBullets[idx] = e.target.value;
                  updateCueCard({ bullets: nextBullets });
                }}
                placeholder={`Bullet ${idx + 1}`}
              />
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 text-red-600"
                onClick={() => {
                  const nextBullets = bullets.filter((_, i) => i !== idx);
                  updateCueCard({ bullets: nextBullets.length ? nextBullets : [""] });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateCueCard({ bullets: [...bullets, ""] })}
          >
            <Plus className="h-3.5 w-3.5" /> Add bullet
          </Button>
        </div>

        <QuestionListEditor
          label="Part 2 — Examiner notes"
          hint="Examiner-only reminders (prep timing, rounding-off questions)."
          questions={content.part2ExaminerNotes ?? [""]}
          onChange={(part2ExaminerNotes) =>
            onContentChange({ ...content, part2ExaminerNotes })
          }
        />
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
        <div className="mb-4">
          <Label className="text-xs font-semibold text-navy">
            Part 3 — Discussion topics &amp; questions
          </Label>
          <p className="text-xs text-muted">
            Examiner-only. Group abstract discussion questions by theme for the
            live console — not visible to the student.
          </p>
        </div>
        <SpeakingTopicsEditor
          tone="violet"
          topics={content.part3Topics ?? [emptySpeakingTopic()]}
          onChange={(part3Topics) =>
            onContentChange({ ...content, part3Topics, part3Questions: undefined })
          }
        />
      </div>
    </div>
  );
}
