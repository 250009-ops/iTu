"use client";

import { useState } from "react";
import { QuestionGroup } from "@/components/exam/questions/question-group";
import { ReadingHeadingsProvider } from "@/components/exam/reading/reading-headings-context";
import { PassageWithHeadingZones } from "@/components/exam/reading/passage-with-heading-zones";
import { TaskVisual } from "@/components/exam/writing/task-visual";
import { InstructionScreen } from "@/components/exam/questions/instruction-screen";
import { useExamState } from "@/lib/exam/use-exam-state";
import { matchingHeadingsForPassage } from "@/lib/exam/matching-headings";
import { useInstructionGate } from "@/hooks/use-instruction-gate";
import type { ContentModule } from "@/lib/admin/types";
import type { MediaAssetRef } from "@/lib/admin/content/listening-media";
import { resolveTask1ImageUrl } from "@/lib/admin/content/writing-media";
import { buildListeningAudioTracks } from "@/lib/exam/listening-audio-tracks";
import { ListeningPreviewAudioBar } from "@/components/admin/content/preview/listening-preview-audio-bar";
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
  mediaAssets?: MediaAssetRef[];
};

export function ContentPreviewPanel({ module, content, mediaAssets = [] }: Props) {
  if (module === "reading") {
    return <ReadingPreview content={content as ReadingContent} />;
  }
  if (module === "listening") {
    return (
      <ListeningPreview
        content={content as ListeningContent}
        mediaAssets={mediaAssets}
      />
    );
  }
  if (module === "writing") {
    return (
      <WritingPreview
        content={content as WritingContent}
        mediaAssets={mediaAssets}
      />
    );
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
  const hasMatchingHeadings =
    passage && matchingHeadingsForPassage(passage.groups).length > 0;
  const { blocking, dismiss, questionGroups, nextQuestionAfter } =
    useInstructionGate(passage?.groups ?? []);

  if (!passage) {
    return <EmptyPreview message="Add at least one passage to preview." />;
  }

  return (
    <ReadingHeadingsProvider>
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
            {hasMatchingHeadings ? (
              <PassageWithHeadingZones
                passage={passage}
                groups={passage.groups}
                answers={state.answers}
                current={state.current}
                textSizeClass="text-sm"
                onAnswer={state.setAnswer}
                onFocus={state.focusQuestion}
              />
            ) : (
              <>
                <h3 className="mb-1 text-center text-lg font-bold text-navy">{passage.title}</h3>
                {passage.subtitle?.trim() && (
                  <p className="mb-4 text-center text-sm italic text-slate-600">
                    {passage.subtitle}
                  </p>
                )}
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
              </>
            )}
          </div>
          <div className="space-y-6 bg-slate-50 p-5">
            {questionGroups.length === 0 ? (
              <p className="text-sm text-muted">No questions in this passage yet.</p>
            ) : (
              questionGroups.map((group) => (
                <QuestionGroup
                  key={group.id}
                  group={group}
                  answers={state.answers}
                  current={state.current}
                  onAnswer={state.setAnswer}
                  onFocus={state.focusQuestion}
                  passageParagraphs={passage.paragraphs}
                />
              ))
            )}
          </div>
        </div>
        {blocking && (
          <InstructionScreen
            group={blocking}
            overlay
            onContinue={() => {
              dismiss(blocking.id);
              const next = nextQuestionAfter(blocking.id);
              if (next != null) state.focusQuestion(next);
            }}
          />
        )}
      </div>
    </ReadingHeadingsProvider>
  );
}

function ListeningPreview({
  content,
  mediaAssets,
}: {
  content: ListeningContent;
  mediaAssets: MediaAssetRef[];
}) {
  const [partIdx, setPartIdx] = useState(0);
  const part = content.parts[partIdx];
  const state = useExamState(part?.id ?? "preview");
  const { blocking, dismiss, questionGroups, nextQuestionAfter } =
    useInstructionGate(part?.groups ?? []);
  const audioTracks = buildListeningAudioTracks(content, mediaAssets);

  if (!part) return <EmptyPreview message="No listening parts to preview." />;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-white">
      <ListeningPreviewAudioBar tracks={audioTracks} />
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
        {questionGroups.map((group) => (
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
      {blocking && (
        <InstructionScreen
          group={blocking}
          overlay
          onContinue={() => {
            dismiss(blocking.id);
            const next = nextQuestionAfter(blocking.id);
            if (next != null) state.focusQuestion(next);
          }}
        />
      )}
    </div>
  );
}

function WritingPreview({
  content,
  mediaAssets,
}: {
  content: WritingContent;
  mediaAssets: MediaAssetRef[];
}) {
  const [taskIdx, setTaskIdx] = useState(0);
  const tasks = content.tasks ?? [];
  const task = tasks[taskIdx];
  const task1ImageUrl = resolveTask1ImageUrl(content, mediaAssets);

  if (!task) return <EmptyPreview message="No writing tasks to preview." />;

  const visual =
    task.taskNumber === 1 && task.visual
      ? { ...task.visual, imageUrl: task1ImageUrl ?? task.visual.imageUrl }
      : task.visual;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex flex-wrap gap-2 border-b border-border bg-slate-50 px-4 py-3">
        {tasks.map((t, idx) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTaskIdx(idx)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              taskIdx === idx ? "bg-violet-600 text-white" : "bg-white text-muted",
            )}
          >
            Task {t.taskNumber}
          </button>
        ))}
      </div>
      <div className="p-6">
        <span className="inline-block rounded-md bg-violet-100 px-2.5 py-1 text-[12px] font-bold text-violet-700">
          Task {task.taskNumber} · {task.minWords}+ words · {task.minutes} min
        </span>
        <p className="mt-4 text-sm text-slate-600">{task.instruction}</p>
        {task.introScreen?.body?.trim() && (
          <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-slate-700">
            <p className="text-xs font-bold uppercase text-muted">Intro screen</p>
            <p className="mt-2 whitespace-pre-wrap">{task.introScreen.body}</p>
          </div>
        )}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-navy">
          {task.prompt || "No prompt yet."}
        </p>
        {visual && (
          <div className="mt-4">
            <TaskVisual visual={visual} />
          </div>
        )}
      </div>
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
