"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FileQuestion, Headphones } from "lucide-react";
import type { AnswerMap, ListeningContent, ReadingContent } from "@/lib/exam/types";
import { QuestionGroup as QuestionGroupView } from "@/components/exam/questions/question-group";
import { InstructionScreen } from "@/components/exam/questions/instruction-screen";
import { useInstructionGate } from "@/hooks/use-instruction-gate";
import {
  PracticeResultCard,
  PracticeSplit,
} from "@/components/practice/practice-chrome";
import {
  GlossedPassage,
  type GlossLanguage,
} from "@/components/practice/glossed-passage";
import type { PracticeGlossaryEntry } from "@/lib/api/practice";
import { cn } from "@/lib/utils";

type Props = {
  skill: "reading" | "listening";
  content: ReadingContent | ListeningContent;
  answers: Record<string, string>;
  onAnswerChange: (questionNumber: number, value: string) => void;
  title?: string;
  unitCode?: string;
  glossary?: PracticeGlossaryEntry[];
  glossLanguage?: GlossLanguage;
  /** Sticky action bar pinned under the questions pane. */
  footer?: ReactNode;
  /** Banner rendered above the questions list (gate cleared, coach hints…). */
  questionsNotice?: ReactNode;
};

export function PracticeSkillPlayer({
  skill,
  content,
  answers,
  onAnswerChange,
  title,
  unitCode,
  glossary = [],
  glossLanguage = "en",
  footer,
  questionsNotice,
}: Props) {
  const [activePart, setActivePart] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);

  const partitions =
    skill === "reading"
      ? ((content as ReadingContent).passages ?? [])
      : ((content as ListeningContent).parts ?? []);

  const partition = partitions[activePart];
  const groups = partition?.groups ?? [];
  const { blocking, dismiss, questionGroups } = useInstructionGate(groups);
  const heading = title || content.title || "Practice";

  const answerMap: AnswerMap = useMemo(() => {
    const map: AnswerMap = {};
    for (const [k, v] of Object.entries(answers)) {
      map[Number(k)] = v;
    }
    return map;
  }, [answers]);

  if (partitions.length === 0) {
    return (
      <PracticeResultCard
        icon={FileQuestion}
        title="No content to display"
        description="This unit has no passages or parts yet. Start another unit from the hub."
      />
    );
  }

  const passagePane =
    skill === "reading" &&
    partition &&
    "paragraphs" in partition &&
    Array.isArray(partition.paragraphs) ? (
      <GlossedPassage
        variant="bare"
        title={partition.title}
        subtitle={
          unitCode
            ? `IELTS Academic Reading · ${unitCode}`
            : "IELTS Academic Reading"
        }
        paragraphs={partition.paragraphs}
        glossary={glossary}
        language={glossLanguage}
        showGlossHint
      />
    ) : skill === "listening" && partition ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Headphones className="h-4 w-4" />
          </span>
          <h3 className="text-[15px] font-bold text-navy">{partition.title}</h3>
        </div>
        {partition.blurb && (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {partition.blurb}
          </p>
        )}
        {"audioUrl" in partition && partition.audioUrl && (
          <audio controls className="mt-4 w-full" src={partition.audioUrl}>
            <track kind="captions" />
          </audio>
        )}
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-muted">
        No source material for this part.
      </div>
    );

  const questionsPane = (
    <>
      {questionsNotice}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
        {blocking ? (
          <div className="mx-auto max-w-2xl">
            <InstructionScreen
              group={blocking}
              onContinue={() => dismiss(blocking.id)}
            />
          </div>
        ) : questionGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-muted">
            No questions in this section yet.
          </div>
        ) : (
          <div className="space-y-4">
            {questionGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <QuestionGroupView
                  group={group}
                  answers={answerMap}
                  current={current}
                  onAnswer={(n, v) => onAnswerChange(n, String(v ?? ""))}
                  onFocus={setCurrent}
                  passageParagraphs={
                    partition && "paragraphs" in partition
                      ? partition.paragraphs
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {footer}
    </>
  );

  return (
    <>
      {partitions.length > 1 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:px-5">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {skill === "reading" ? "Passages" : "Parts"}
          </span>
          {partitions.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActivePart(i)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activePart === i
                  ? "bg-navy text-white"
                  : "bg-slate-100 text-muted hover:text-navy",
              )}
            >
              {"title" in p && p.title ? p.title : `Part ${i + 1}`}
            </button>
          ))}
          <span className="ml-auto shrink-0 truncate pl-3 text-xs text-slate-400">
            {heading}
          </span>
        </div>
      )}

      <PracticeSplit
        leftLabel={skill === "reading" ? "Passage" : "Audio"}
        rightLabel="Questions"
        left={passagePane}
        right={questionsPane}
      />
    </>
  );
}
