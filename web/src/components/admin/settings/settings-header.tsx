"use client";

import { Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { useToast } from "@/components/ui/toast";

export function SettingsHeader() {
  const { unsavedChanges, saveAll } = useAdminSettings();
  const { toast } = useToast();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Configure platform behaviour, exam rules, pricing, and integrations.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {unsavedChanges > 0 && (
          <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <Clock className="h-3.5 w-3.5" />
            {unsavedChanges} unsaved changes
          </span>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={async () => {
            try {
              await saveAll();
              toast("Settings saved", {
                description: "All platform settings have been updated.",
                variant: "success",
              });
            } catch {
              toast("Failed to save settings", { variant: "warning" });
            }
          }}
        >
          <Save className="h-4 w-4" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
