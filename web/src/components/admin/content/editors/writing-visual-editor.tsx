"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WritingTask1ImageUpload } from "@/components/admin/content/writing-task1-image-upload";
import type { WritingContent } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  testId?: string;
  content: WritingContent;
  onContentChange: (content: WritingContent) => void;
  onMediaUpdated?: () => void;
};

export function WritingVisualEditor({
  testId,
  content,
  onContentChange,
  onMediaUpdated,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const tasks = content.tasks ?? [];
  const task = tasks[activeIdx];

  if (!task) {
    return <p className="text-sm text-muted">No writing tasks defined.</p>;
  }

  function updateTask(patch: Partial<typeof task>) {
    const nextTasks = [...tasks];
    nextTasks[activeIdx] = { ...task, ...patch };
    onContentChange({ ...content, tasks: nextTasks });
  }

  function setTask1ImageUrl(url: string) {
    const task1Idx = tasks.findIndex((t) => t.taskNumber === 1);
    if (task1Idx < 0) return;
    const task1 = tasks[task1Idx]!;
    const visual = task1.visual ?? { kind: "bar" as const, caption: "" };
    const nextTasks = [...tasks];
    nextTasks[task1Idx] = {
      ...task1,
      visual: { ...visual, imageUrl: url },
    };
    onContentChange({ ...content, tasks: nextTasks });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tasks.map((t, idx) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              activeIdx === idx
                ? "bg-violet-600 text-white"
                : "border border-border bg-white text-muted hover:text-navy",
            )}
          >
            Task {t.taskNumber}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Minutes</Label>
          <Input
            type="number"
            min={1}
            value={task.minutes}
            onChange={(e) => updateTask({ minutes: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Minimum words</Label>
          <Input
            type="number"
            min={1}
            value={task.minWords}
            onChange={(e) => updateTask({ minWords: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Instruction</Label>
        <textarea
          value={task.instruction}
          onChange={(e) => updateTask({ instruction: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-slate-50 p-3 text-sm text-navy focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
        />
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <textarea
          value={task.prompt}
          onChange={(e) => updateTask({ prompt: e.target.value })}
          rows={8}
          className="w-full rounded-lg border border-border bg-slate-50 p-3 text-sm leading-relaxed text-navy focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
          placeholder="Task prompt shown to students…"
        />
      </div>

      {task.taskNumber === 1 && (
        <div className="space-y-4 rounded-lg border border-border bg-slate-50 p-4">
          <div>
            <Label className="text-sm font-semibold text-navy">Task 1 visual</Label>
            <p className="mt-0.5 text-xs text-muted">
              Upload the chart, graph, map, or diagram students describe in Task 1.
            </p>
          </div>

          {testId ? (
            <WritingTask1ImageUpload
              testId={testId}
              imageUrl={task.visual?.imageUrl}
              onImageUploaded={setTask1ImageUrl}
              onMediaUpdated={onMediaUpdated}
            />
          ) : (
            <p className="text-xs text-amber-700">
              Save the test first to upload a Task 1 image.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Visual type (metadata)</Label>
              <select
                value={task.visual?.kind ?? ""}
                onChange={(e) => {
                  const kind = e.target.value as NonNullable<typeof task.visual>["kind"] | "";
                  updateTask({
                    visual: kind
                      ? {
                          kind,
                          caption: task.visual?.caption ?? "",
                          imageUrl: task.visual?.imageUrl,
                          alt: task.visual?.alt,
                        }
                      : undefined,
                  });
                }}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
              >
                <option value="">None</option>
                <option value="line">Line chart</option>
                <option value="bar">Bar chart</option>
                <option value="pie">Pie chart</option>
                <option value="table">Table</option>
                <option value="process">Process diagram</option>
                <option value="map">Map</option>
              </select>
            </div>
            {task.visual && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Caption / figure label</Label>
                  <Input
                    value={task.visual.caption}
                    onChange={(e) =>
                      updateTask({
                        visual: { ...task.visual!, caption: e.target.value },
                      })
                    }
                    placeholder="e.g. Household renewable energy use (%), 2010–2024"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Alt text (accessibility)</Label>
                  <Input
                    value={task.visual.alt ?? ""}
                    onChange={(e) =>
                      updateTask({
                        visual: { ...task.visual!, alt: e.target.value || undefined },
                      })
                    }
                    placeholder="Brief description of the diagram for screen readers"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
