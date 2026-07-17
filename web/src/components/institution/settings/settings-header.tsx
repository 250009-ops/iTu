"use client";

import { Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstitutionSettingsHeaderProps = {
  unsavedChanges: number;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
};

export function InstitutionSettingsHeader({
  unsavedChanges,
  saving,
  canSave,
  onSave,
}: InstitutionSettingsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Institution &gt; Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your center profile and public sign-up link.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canSave && unsavedChanges > 0 && (
          <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <Clock className="h-3.5 w-3.5" />
            {unsavedChanges} unsaved changes
          </span>
        )}
        {canSave && (
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
        )}
      </div>
    </div>
  );
}
