"use client";

import { useEffect, useState } from "react";
import { QuestionGroupsPanel } from "@/components/admin/content/forms/question-groups-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminPractice } from "@/contexts/admin-practice-context";
import { uploadPracticeUnitMedia } from "@/lib/api/admin";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { ListeningPart, QuestionGroup, ReadingPassage } from "@/lib/exam/types";
import { useToast } from "@/components/ui/toast";

type Props = {
  unitId: string;
  module: "reading" | "listening";
};

export function PracticeUnitEditor({ unitId, module }: Props) {
  const { loadUnit, saveUnit, publishUnit, archiveUnit, removeUnit } =
    useAdminPractice();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [durationMin, setDurationMin] = useState(20);
  const [status, setStatus] = useState("draft");
  const [passage, setPassage] = useState<ReadingPassage | ListeningPart | null>(
    null,
  );
  const [answerKey, setAnswerKey] = useState<AnswerKeyMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadUnit(unitId)
      .then((raw) => {
        if (!active) return;
        const unit = raw as {
          title: string;
          questionType: string | null;
          durationMin: number;
          status: string;
          content: {
            passages?: ReadingPassage[];
            parts?: ListeningPart[];
          };
          answerKey?: AnswerKeyMap;
        };
        setTitle(unit.title);
        setQuestionType(unit.questionType ?? "");
        setDurationMin(unit.durationMin);
        setStatus(unit.status.toLowerCase());
        const partition =
          module === "reading"
            ? unit.content.passages?.[0]
            : unit.content.parts?.[0];
        setPassage(partition ?? null);
        setAnswerKey((unit.answerKey as AnswerKeyMap) ?? {});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [unitId, module, loadUnit]);

  if (loading || !passage) {
    return <div className="py-12 text-center text-sm text-muted">Loading…</div>;
  }

  const groups = passage.groups ?? [];

  function updateGroups(next: QuestionGroup[]) {
    if (!passage) return;
    setPassage({ ...passage, groups: next });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const content =
        module === "reading"
          ? { passages: [{ ...passage, groups }] }
          : { parts: [{ ...passage, groups }] };
      await saveUnit(unitId, {
        title,
        questionType: questionType || undefined,
        content,
        answerKey,
        durationMin,
      });
      toast("Saved", { variant: "success" });
    } catch {
      toast("Save failed", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
          />
        </div>
        {questionType !== undefined && (
          <div>
            <Label>Question type (for drills)</Label>
            <Input
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              placeholder="e.g. mcq_single"
            />
          </div>
        )}
      </div>

      {"paragraphs" in passage && (
        <div>
          <Label>Passage text</Label>
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-200 p-3 text-sm"
            value={passage.paragraphs.map((p) => p.text).join("\n\n")}
            onChange={(e) =>
              setPassage({
                ...passage,
                paragraphs: e.target.value
                  .split(/\n\n+/)
                  .filter(Boolean)
                  .map((text, i) => ({
                    marker: String.fromCharCode(65 + i),
                    text,
                  })),
              })
            }
          />
        </div>
      )}

      {module === "listening" && (
        <div>
          <Label>Section audio</Label>
          <input
            type="file"
            accept="audio/*"
            className="mt-1 block text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void uploadPracticeUnitMedia(unitId, "full-audio", file).then(() =>
                toast("Audio uploaded", { variant: "success" }),
              );
            }}
          />
        </div>
      )}

      <QuestionGroupsPanel
        groups={groups}
        module={module}
        partNumber={1}
        testId={unitId}
        answerKey={answerKey}
        onGroupsChange={updateGroups}
        onAnswerKeyChange={setAnswerKey}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={saving || status === "published"} onClick={() => void handleSave()}>
          Save draft
        </Button>
        {status === "draft" && (
          <Button
            variant="secondary"
            onClick={() => void publishUnit(unitId).then(() => toast("Published", { variant: "success" }))}
          >
            Publish
          </Button>
        )}
        {status === "published" && (
          <Button variant="secondary" onClick={() => void archiveUnit(unitId)}>
            Archive
          </Button>
        )}
        {status === "draft" && (
          <Button variant="ghost" onClick={() => void removeUnit(unitId)}>
            Delete draft
          </Button>
        )}
      </div>
    </div>
  );
}
