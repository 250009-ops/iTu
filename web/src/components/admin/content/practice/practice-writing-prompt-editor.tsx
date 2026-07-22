"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminPractice } from "@/contexts/admin-practice-context";
import { scrollPracticeEditorToTop } from "@/components/admin/content/practice/practice-editor-scroll";
import { useToast } from "@/components/ui/toast";

type Props = {
  promptId: string;
};

export function PracticeWritingPromptEditor({ promptId }: Props) {
  const { loadPrompt, savePrompt, publishPrompt } = useAdminPractice();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [minWords, setMinWords] = useState(150);
  const [taskNumber, setTaskNumber] = useState(1);
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadPrompt(promptId).then((raw) => {
      const p = raw as {
        title: string;
        instruction: string;
        minWords: number;
        taskNumber: number;
        status: string;
      };
      setTitle(p.title);
      setInstruction(p.instruction);
      setMinWords(p.minWords);
      setTaskNumber(p.taskNumber);
      setStatus(p.status.toLowerCase());
    });
  }, [promptId, loadPrompt]);

  async function handleSave() {
    setSaving(true);
    try {
      await savePrompt(promptId, { title, instruction, minWords });
      toast("Saved", { variant: "success" });
      scrollPracticeEditorToTop();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Minimum words</Label>
          <Input
            type="number"
            value={minWords}
            onChange={(e) => setMinWords(Number(e.target.value))}
          />
        </div>
      </div>
      <p className="text-sm text-muted">IELTS Writing Task {taskNumber}</p>
      <div>
        <Label>Prompt / instruction</Label>
        <textarea
          className="mt-1 min-h-[160px] w-full rounded-lg border border-slate-200 p-3 text-sm"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="primary" disabled={saving || status === "published"} onClick={() => void handleSave()}>
          Save
        </Button>
        {status === "draft" && (
          <Button
            variant="secondary"
            onClick={() =>
              void publishPrompt(promptId).then(() => {
                toast("Published", { variant: "success" });
                scrollPracticeEditorToTop();
              })
            }
          >
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
