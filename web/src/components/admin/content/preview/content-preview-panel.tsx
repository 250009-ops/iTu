"use client";

import { useState } from "react";
import { QuestionGroup } from "@/components/exam/questions/question-group";
import { TaskVisual } from "@/components/exam/writing/task-visual";
import { useExamState } from "@/lib/exam/use-exam-state";
import type { ContentModule } from "@/lib/admin/types";
import type {
  ListeningContent,
  ReadingContent,
  SpeakingContent,
  WritingContent,
} from "@/lib/exam/types";
import { cn } from "@/lib/utils";
import { isHtmlContent, sanitizePassageHtml } from "@/lib/admin/content/sanitize-html";

type Props = {
  module: ContentModule;
  content: object;
};

export function ContentPreviewPanel({ module, content }: Props) {
  if (module === "reading") {
    return <ReadingPreview content={content as ReadingContent} />;
  }
  if (module === "listening") {
    return <ListeningPreview content={content as ListeningContent} />;
  }
  if (module === "writing") {
    return <WritingPreview content={content as WritingContent} />;
  }
  if (module === "speaking") {
    return <SpeakingPreview content={content as SpeakingContent} />;
  }
  return null;
}

function ReadingPreview({ content }: { content: ReadingContent }) {
  const [passageIdx, setPassageIdx] = useState(0);
  const passage = content.passages[passageIdx];
  const state = useExamState(passage?.id ?? "preview");

  if (!passage) {
    return <EmptyPreview message="Add at least one passage to preview." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex flex-wrap gap-2 border-b border-border bg-slate-50 px-4 py-3">
        {content.passages.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPassageIdx(idx)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              passageIdx === idx ? "bg-navy text-white" : "bg-white text-muted",
            )}
          >
            Passage {p.part}
          </button>
        ))}
      </div>
      <div className="grid min-h-[420px] lg:grid-cols-2">
        <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
          <h3 className="mb-3 text-lg font-bold text-navy">{passage.title}</h3>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            {passage.paragraphs.map((para, i) => (
              <p key={i}>
                {para.marker && (
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold">
                    {para.marker}
                  </span>
                )}
                {para.text ? (
                  isHtmlContent(para.text) ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: sanitizePassageHtml(para.text),
                      }}
                    />
                  ) : (
                    para.text
                  )
                ) : (
                  <span className="italic text-muted">Empty paragraph</span>
                )}
              </p>
            ))}
          </div>
        </div>
        <div className="space-y-6 bg-slate-50 p-5">
          {passage.groups.length === 0 ? (
            <p className="text-sm text-muted">No questions in this passage yet.</p>
          ) : (
            passage.groups.map((group) => (
              <QuestionGroup
                key={group.id}
                group={group}
                answers={state.answers}
                current={state.current}
                onAnswer={state.setAnswer}
                onFocus={state.focusQuestion}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ListeningPreview({ content }: { content: ListeningContent }) {
  const [partIdx, setPartIdx] = useState(0);
  const part = content.parts[partIdx];
  const state = useExamState(part?.id ?? "preview");

  if (!part) return <EmptyPreview message="No listening parts to preview." />;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex flex-wrap gap-2 border-b border-border bg-slate-50 px-4 py-3">
        {content.parts.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPartIdx(idx)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              partIdx === idx ? "bg-sky-600 text-white" : "bg-white text-muted",
            )}
          >
            Part {p.part}
          </button>
        ))}
      </div>
      <div className="space-y-6 p-5">
        <p className="text-sm font-medium text-navy">{part.blurb}</p>
        {part.groups.map((group) => (
          <QuestionGroup
            key={group.id}
            group={group}
            answers={state.answers}
            current={state.current}
            onAnswer={state.setAnswer}
            onFocus={state.focusQuestion}
          />
        ))}
      </div>
    </div>
  );
}

function WritingPreview({ content }: { content: WritingContent }) {
  const task = content.tasks[0];
  if (!task) return <EmptyPreview message="No writing tasks to preview." />;

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <p className="text-xs font-semibold uppercase text-muted">Task {task.taskNumber}</p>
      <p className="mt-2 text-sm text-slate-600">{task.instruction}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-navy">
        {task.prompt || "No prompt yet."}
      </p>
      {task.visual && (
        <div className="mt-4">
          <TaskVisual visual={task.visual} />
        </div>
      )}
    </div>
  );
}

function SpeakingPreview({ content }: { content: SpeakingContent }) {
  const p1 = content.part1Questions?.filter((q) => q.trim()) ?? [];
  const p3 = content.part3Questions?.filter((q) => q.trim()) ?? [];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-white p-6">
      {content.parts.map((part) => (
        <div key={part.part} className="rounded-lg border border-border p-4">
          <p className="font-semibold text-navy">
            Part {part.part}: {part.title}
          </p>
          <p className="mt-1 text-sm text-muted">{part.guidance}</p>
        </div>
      ))}
      {p1.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-bold uppercase text-muted">Part 1 questions (examiner)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {p1.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      )}
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="font-semibold text-navy">{content.cueCard.title || "Cue card topic"}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {content.cueCard.bullets.map((b, i) => (
            <li key={i}>{b || "…"}</li>
          ))}
        </ul>
      </div>
      {p3.length > 0 && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-bold uppercase text-muted">Part 3 questions (examiner)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {p3.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function EmptyPreview({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-slate-50 px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}
