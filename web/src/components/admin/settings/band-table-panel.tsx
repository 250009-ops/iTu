"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getBandTable, rescoreAllListeningReading, updateBandTable, type BandTableRow } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";

type EditableRow = BandTableRow & { key: string };

function rowKey(skill: string, rawScore: number) {
  return `${skill}-${rawScore}`;
}

export function BandTablePanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBandTable();
      setRows(
        data.map((r) => ({
          ...r,
          key: rowKey(r.skill, r.rawScore),
        })),
      );
      setDirty(false);
    } catch (err) {
      toast("Failed to load band table", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const listening = useMemo(
    () =>
      rows
        .filter((r) => r.skill === "LISTENING")
        .sort((a, b) => b.rawScore - a.rawScore),
    [rows],
  );

  const reading = useMemo(
    () =>
      rows
        .filter((r) => r.skill === "READING")
        .sort((a, b) => b.rawScore - a.rawScore),
    [rows],
  );

  function updateBand(key: string, band: number) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, band } : r)),
    );
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = rows.map(({ skill, rawScore, band }) => ({
        skill,
        rawScore,
        band,
      }));
      const updated = await updateBandTable(payload);
      setRows(
        updated.map((r) => ({
          ...r,
          key: rowKey(r.skill, r.rawScore),
        })),
      );
      setDirty(false);
      toast("Band table saved", {
        description: "New thresholds apply to newly graded exams.",
        variant: "success",
      });
    } catch (err) {
      toast("Failed to save band table", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRescoreAll() {
    setRescoring(true);
    try {
      const result = await rescoreAllListeningReading();
      toast("Bulk rescore complete", {
        description: `Recalculated Listening/Reading for ${result.updated} of ${result.total} enrollments.`,
        variant: "success",
      });
    } catch (err) {
      toast("Bulk rescore failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setRescoring(false);
    }
  }

  function SkillTable({
    title,
    skillRows,
  }: {
    title: string;
    skillRows: EditableRow[];
  }) {
    return (
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          {title}
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="pb-2 pr-3">Raw Score</th>
              <th className="pb-2">Band</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {skillRows.map((row) => (
              <tr key={row.key}>
                <td className="py-2 pr-3 font-medium text-navy">
                  {row.rawScore}
                </td>
                <td className="py-2">
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    step={0.5}
                    value={row.band}
                    onChange={(e) =>
                      updateBand(row.key, Number(e.target.value))
                    }
                    className="h-8 w-20 text-center"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Band Conversion Table</h2>
          <p className="mt-0.5 text-sm text-muted">
            Raw score → IELTS band mapping for Listening and Reading auto-scoring.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={rescoring}
            disabled={loading}
            onClick={() => void handleRescoreAll()}
          >
            Rescore all L/R
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={!dirty || loading}
            onClick={handleSave}
          >
          <Save className="h-4 w-4" />
          Save Table
        </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Edit band values per raw score. Changes apply to newly graded exams only.
        </p>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-muted">Loading band table…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No band conversion rows found. Run the database seed to populate defaults.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <SkillTable title="Listening" skillRows={listening} />
          <SkillTable title="Reading" skillRows={reading} />
        </div>
      )}
    </div>
  );
}
