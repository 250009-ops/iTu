"use client";

import { useState, type ChangeEvent } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNextTestIdentity } from "@/hooks/use-next-test-identity";
import type { ContentModule } from "@/lib/admin/types";
import { useAdminContent } from "@/contexts/admin-content-context";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";

type Props = {
  open: boolean;
  module: ContentModule;
  onClose: () => void;
};

type ImportMode = "json" | "csv";

export function ImportContentDialog({ open, module, onClose }: Props) {
  const { importTest, importAnswerKey, selectedTestId } = useAdminContent();
  const { toast } = useToast();
  const [mode, setMode] = useState<ImportMode>("json");
  const { code, title, setCode, setTitle, loadingIdentity } = useNextTestIdentity(
    module,
    open,
  );
  const [jsonText, setJsonText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleImportJson() {
    if (!jsonText.trim()) {
      toast("Paste JSON to import", { variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      const parsed = JSON.parse(jsonText) as {
        content?: object;
        answerKey?: object;
        durationMin?: number;
      };

      if (!parsed.content) {
        toast("JSON must include a content object", { variant: "error" });
        return;
      }

      await importTest({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        type: module.toUpperCase() as "LISTENING" | "READING" | "WRITING" | "SPEAKING",
        content: parsed.content,
        answerKey: parsed.answerKey,
        durationMin: parsed.durationMin,
      });

      toast("Test imported", { variant: "success" });
      onClose();
    } catch (err) {
      toast("Import failed", {
        description: getErrorMessage(err, "Check JSON format and unique code."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleImportCsv() {
    if (!selectedTestId) {
      toast("Select a test first", {
        description: "Choose a listening/reading test to import answer keys into.",
        variant: "warning",
      });
      return;
    }
    if (!csvText.trim()) {
      toast("Paste CSV to import", { variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      await importAnswerKey(selectedTestId, csvText);
      toast("Answer keys imported", { variant: "success" });
      onClose();
    } catch (err) {
      toast("CSV import failed", {
        description: getErrorMessage(err, "Use format: question,answer"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (mode === "json") setJsonText(text);
      else setCsvText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-navy">Import content</h2>
        <p className="mt-1 text-sm text-muted">
          Bulk import a full test from JSON or answer keys from CSV into the selected test.
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            variant={mode === "json" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("json")}
          >
            Full test JSON
          </Button>
          <Button
            variant={mode === "csv" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("csv")}
          >
            Answer key CSV
          </Button>
        </div>

        {mode === "json" ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={loadingIdentity} />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  disabled={loadingIdentity}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>JSON file or paste</Label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-sky-700">
                <FileUp className="h-4 w-4" />
                Upload .json
                <input type="file" accept=".json,application/json" className="sr-only" onChange={handleFile} />
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                placeholder={'{\n  "content": { ... },\n  "answerKey": { "1": "TRUE" },\n  "durationMin": 60\n}'}
                className="w-full rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted">
              Format: question number, answer (one per line). Use pipe for multi-select:{" "}
              <code className="rounded bg-slate-100 px-1">20,B|C</code>
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-sky-700">
              <FileUp className="h-4 w-4" />
              Upload .csv
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              placeholder={"question,answer\n1,TRUE\n2,FALSE\n20,B|C"}
              className="w-full rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={mode === "json" && loadingIdentity}
            onClick={() => void (mode === "json" ? handleImportJson() : handleImportCsv())}
          >
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}
