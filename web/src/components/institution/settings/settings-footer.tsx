"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstitutionSettingsFooterProps = {
  lastSaved: string;
  unsavedChanges: number;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export function InstitutionSettingsFooter({
  lastSaved,
  unsavedChanges,
  saving,
  canSave,
  onSave,
  onDiscard,
}: InstitutionSettingsFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-muted">
        {canSave && unsavedChanges > 0 && (
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" />
        )}
        Last saved: {lastSaved}
        {canSave && unsavedChanges > 0 && (
          <>
            {" "}
            ·{" "}
            <span className="font-semibold text-amber-700">
              {unsavedChanges} unsaved changes
            </span>
          </>
        )}
      </p>
      {canSave ? (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={unsavedChanges === 0}
            onClick={onDiscard}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={unsavedChanges === 0}
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted">These links are managed by the platform.</p>
      )}
    </div>
  );
}
