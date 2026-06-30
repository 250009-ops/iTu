"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContentTemplate } from "@/lib/admin/content-templates";
import type { ContentModule } from "@/lib/admin/types";
import { useAdminContent } from "@/contexts/admin-content-context";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { useNextTestIdentity } from "@/hooks/use-next-test-identity";
import { useState } from "react";

type Props = {
  open: boolean;
  module: ContentModule;
  onClose: () => void;
};

export function CreateTestDialog({ open, module, onClose }: Props) {
  const { createTest } = useAdminContent();
  const { toast } = useToast();
  const { code, title, setCode, setTitle, loadingIdentity } = useNextTestIdentity(
    module,
    open,
  );
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!title.trim() || !code.trim()) {
      toast("Title and code are required", { variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      const template = getContentTemplate(module);
      const test = await createTest({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        type: module.toUpperCase() as "LISTENING" | "READING" | "WRITING" | "SPEAKING",
        content: template.content,
        answerKey: template.answerKey,
        durationMin: template.durationMin,
      });
      toast("Test created", {
        description: `${test.title} is ready to edit.`,
        variant: "success",
      });
      onClose();
    } catch (err) {
      toast("Could not create test", {
        description: getErrorMessage(err, "Check the code is unique."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-navy">Create new test</h2>
        <p className="mt-1 text-sm text-muted">
          Creates a draft from the bundled {module} template. Edit sections in
          the visual editor, preview, then publish.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-test-title">Title</Label>
            <Input
              id="new-test-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loadingIdentity}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-test-code">Code</Label>
            <Input
              id="new-test-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
              disabled={loadingIdentity}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={loadingIdentity}
            onClick={() => void handleCreate()}
          >
            Create draft
          </Button>
        </div>
      </div>
    </div>
  );
}
