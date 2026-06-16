"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SpeakingContent } from "@/lib/exam/types";

type Props = {
  content: SpeakingContent;
  onContentChange: (content: SpeakingContent) => void;
};

export function SpeakingVisualEditor({ content, onContentChange }: Props) {
  function updatePart(index: number, patch: Partial<(typeof content.parts)[0]>) {
    const parts = [...content.parts];
    parts[index] = { ...parts[index], ...patch };
    onContentChange({ ...content, parts });
  }

  function updateCueCard(patch: Partial<SpeakingContent["cueCard"]>) {
    onContentChange({ ...content, cueCard: { ...content.cueCard, ...patch } });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy">Speaking parts</h3>
        {content.parts.map((part, idx) => (
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
                <Label className="text-xs">Guidance (shown to student)</Label>
                <Input
                  value={part.guidance}
                  onChange={(e) => updatePart(idx, { guidance: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
        <h3 className="text-sm font-semibold text-navy">Part 2 cue card</h3>
        <div className="space-y-2">
          <Label className="text-xs">Topic title</Label>
          <Input
            value={content.cueCard.title}
            onChange={(e) => updateCueCard({ title: e.target.value })}
            placeholder="Describe a book you read recently…"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Preparation (seconds)</Label>
            <Input
              type="number"
              value={content.cueCard.prepSeconds}
              onChange={(e) => updateCueCard({ prepSeconds: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Speaking time (seconds)</Label>
            <Input
              type="number"
              value={content.cueCard.speakSeconds}
              onChange={(e) => updateCueCard({ speakSeconds: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Bullet prompts</Label>
          {content.cueCard.bullets.map((bullet, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={bullet}
                onChange={(e) => {
                  const bullets = [...content.cueCard.bullets];
                  bullets[idx] = e.target.value;
                  updateCueCard({ bullets });
                }}
                placeholder={`Bullet ${idx + 1}`}
              />
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 text-red-600"
                onClick={() => {
                  const bullets = content.cueCard.bullets.filter((_, i) => i !== idx);
                  updateCueCard({ bullets: bullets.length ? bullets : [""] });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateCueCard({ bullets: [...content.cueCard.bullets, ""] })}
          >
            <Plus className="h-3.5 w-3.5" /> Add bullet
          </Button>
        </div>
      </div>
    </div>
  );
}
