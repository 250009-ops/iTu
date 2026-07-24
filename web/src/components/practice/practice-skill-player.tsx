"use client";

import { useMemo, useState } from "react";
import type { AnswerMap, ListeningContent, ReadingContent } from "@/lib/exam/types";
import { QuestionGroup as QuestionGroupView } from "@/components/exam/questions/question-group";
import { InstructionScreen } from "@/components/exam/questions/instruction-screen";
import { useInstructionGate } from "@/hooks/use-instruction-gate";
import { Button } from "@/components/ui/button";
import {
  GlossedPassage,
  type GlossLanguage,
} from "@/components/practice/glossed-passage";
import type { PracticeGlossaryEntry } from "@/lib/api/practice";

type Props = {
  skill: "reading" | "listening";
  content: ReadingContent | ListeningContent;
  answers: Record<string, string>;
  onAnswerChange: (questionNumber: number, value: string) => void;
  glossary?: PracticeGlossaryEntry[];
  glossLanguage?: GlossLanguage;
  onGlossLanguageChange?: (lang: GlossLanguage) => void;
};

export function PracticeSkillPlayer({
  skill,
  content,
  answers,
  onAnswerChange,
  glossary = [],
  glossLanguage = "en",
  onGlossLanguageChange,
}: Props) {
  const [activePart, setActivePart] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);

  const partitions =
    skill === "reading"
      ? (content as ReadingContent).passages
      : (content as ListeningContent).parts;

  const partition = partitions[activePart];
  const groups = partition?.groups ?? [];
  const { blocking, dismiss, questionGroups } = useInstructionGate(groups);

  const answerMap: AnswerMap = useMemo(() => {
    const map: AnswerMap = {};
    for (const [k, v] of Object.entries(answers)) {
      map[Number(k)] = v;
    }
    return map;
  }, [answers]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-navy">{content.title}</h1>
        <p className="text-xs text-muted">Practice mode · {skill}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {partitions.map((p, i) => (
            <Button
              key={i}
              size="sm"
              variant={activePart === i ? "primary" : "secondary"}
              onClick={() => setActivePart(i)}
            >
              {"title" in p ? p.title : `Part ${i + 1}`}
            </Button>
          ))}
        </div>
      </header>

      {blocking && (
        <div className="p-4">
          <InstructionScreen
            group={blocking}
            onContinue={() => dismiss(blocking.id)}
          />
        </div>
      )}

      {!blocking && (
        <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-2">
          {skill === "reading" && partition && "paragraphs" in partition && (
            <GlossedPassage
              title={partition.title}
              paragraphs={partition.paragraphs}
              glossary={glossary}
              language={glossLanguage}
              onLanguageChange={onGlossLanguageChange}
            />
          )}

          {skill === "listening" && partition && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-navy">{partition.title}</h2>
              <p className="mt-2 text-sm text-muted">{partition.blurb}</p>
              {"audioUrl" in partition && partition.audioUrl && (
                <audio controls className="mt-4 w-full" src={partition.audioUrl}>
                  <track kind="captions" />
                </audio>
              )}
            </div>
          )}

          <div className="space-y-6">
            {questionGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
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
        </div>
      )}
    </div>
  );
}
