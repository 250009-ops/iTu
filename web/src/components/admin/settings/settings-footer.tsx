"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { useToast } from "@/components/ui/toast";

export function SettingsFooter() {
  const { lastSaved, unsavedChanges, saveAll, discard } = useAdminSettings();
  const { toast } = useToast();

  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-muted">
        {unsavedChanges > 0 && (
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" />
        )}
        Last saved: {lastSaved}
        {unsavedChanges > 0 && (
          <>
            {" "}
            ·{" "}
            <span className="font-semibold text-amber-700">
              {unsavedChanges} unsaved changes
            </span>
          </>
        )}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={unsavedChanges === 0}
          onClick={() => {
            discard();
            toast("Changes discarded", {
              description: "Unsaved changes have been reverted.",
              variant: "info",
            });
          }}
        >
          Discard
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={unsavedChanges === 0}
          onClick={async () => {
            try {
              await saveAll();
              toast("Settings saved", {
                description: "Your changes have been persisted.",
                variant: "success",
              });
            } catch {
              toast("Failed to save settings", { variant: "warning" });
            }
          }}
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
