"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  getGrantableInstitutionMockSets,
  grantInstitutionMockSet,
  type GrantableMockSet,
} from "@/lib/api/admin-institution-mock-sets";
import type { AdminInstitution } from "@/lib/api/admin-institutions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";

export function InstitutionGrantSetDialog({
  open,
  institution,
  onClose,
  onGranted,
}: {
  open: boolean;
  institution: AdminInstitution | null;
  onClose: () => void;
  onGranted: () => void;
}) {
  const { toast } = useToast();
  const [sets, setSets] = useState<GrantableMockSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [setId, setSetId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !institution) return;
    setSetId("");
    setNote("");
    setLoading(true);
    void getGrantableInstitutionMockSets(institution.id)
      .then(setSets)
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, [open, institution]);

  async function handleGrant() {
    if (!institution || !setId) return;
    setSubmitting(true);
    try {
      await grantInstitutionMockSet(institution.id, setId, note.trim() || undefined);
      toast("Mock set granted", {
        description: `${institution.name} can now use this set.`,
        variant: "success",
      });
      onGranted();
      onClose();
    } catch (err) {
      toast("Grant failed", {
        description: getErrorMessage(err, "Could not grant mock set."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Grant mock set"
      className="max-w-md"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">
          Grant mock set · {institution?.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        {loading ? (
          <p className="text-sm text-muted">Loading available sets…</p>
        ) : sets.length === 0 ? (
          <p className="text-sm text-muted">
            No active sets available — this centre already has all sets, or none
            exist yet.
          </p>
        ) : (
          <>
            <div>
              <Label>Mock set</Label>
              <select
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
              >
                <option value="">Select a set…</option>
                {sets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title} ({set.contentSummary})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal note for this grant"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={submitting}
          disabled={!setId}
          onClick={handleGrant}
        >
          Grant set
        </Button>
      </div>
    </Modal>
  );
}
