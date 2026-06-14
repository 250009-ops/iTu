"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { listeningParts, questionTypes } from "@/lib/admin/constants";
import { useToast } from "@/components/ui/toast";

export function ListeningEditor() {
  const { toast } = useToast();
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 className="font-semibold text-navy">Listening Editor</h2>
          <p className="mt-0.5 text-sm text-muted">New test — unsaved draft</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast("Draft saved", { variant: "success" })}
          >
            Save Draft
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast("Sent for review", {
                description: "A senior author will review this test.",
                variant: "success",
              })
            }
          >
            Send for Review
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() =>
              toast("Test published", {
                description: "This listening test is now live for booking.",
                variant: "success",
              })
            }
          >
            Publish
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="test-title" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Test Title
            </Label>
            <Input
              id="test-title"
              placeholder="e.g. Listening Test #14 — Airport Directions"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="question-type" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Question Type
            </Label>
            <Select id="question-type" defaultValue={questionTypes[0]}>
              {questionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Audio Files
          </Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {listeningParts.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() =>
                  toast(`Upload audio · ${part}`, {
                    description: "Select an MP3 or WAV file to attach.",
                    variant: "info",
                  })
                }
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 transition-colors hover:border-sky-300 hover:bg-sky-50/50"
              >
                <Upload className="h-5 w-5 text-muted" />
                <span className="text-sm font-semibold text-navy">{part}</span>
                <span className="text-[10px] text-muted">MP3 / WAV</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          4 parts · 40 questions total · Preview available after saving audio
        </div>
      </div>
    </div>
  );
}
