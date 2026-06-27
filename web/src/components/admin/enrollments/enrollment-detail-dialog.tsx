"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  getEnrollmentDetail,
  overrideSectionScore,
  rescoreEnrollment,
  type AdminEnrollmentDetail,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { moduleBadges } from "@/lib/admin/constants";
import type { ModuleKey } from "@/lib/admin/types";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Props = {
  enrollmentId: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

type SkillDraft = {
  band: string;
  rawScore: string;
};

export function EnrollmentDetailDialog({
  enrollmentId,
  open,
  onClose,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<AdminEnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SkillDraft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEnrollmentDetail(enrollmentId);
      setDetail(data);
      const next: Record<string, SkillDraft> = {};
      for (const s of data.skills) {
        next[s.skill] = {
          band: s.band != null ? String(s.band) : "",
          rawScore: s.rawScore != null ? String(s.rawScore) : "",
        };
      }
      setDrafts(next);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load enrollment"));
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  async function handleRescore() {
    setActing(true);
    try {
      const result = await rescoreEnrollment(enrollmentId);
      toast("Scores recalculated", {
        description:
          result.rescored.length > 0
            ? `Updated ${result.rescored.map((r) => r.skill).join(", ")}.`
            : "No Listening/Reading sections to rescore.",
        variant: "success",
      });
      await load();
      onUpdated?.();
    } catch (err) {
      toast("Rescore failed", {
        description: getErrorMessage(err, "Request failed"),
        variant: "error",
      });
    } finally {
      setActing(false);
    }
  }

  async function handleSaveSkill(skill: string) {
    const draft = drafts[skill];
    if (!draft?.band.trim()) return;
    const band = Number(draft.band);
    if (Number.isNaN(band)) return;

    setActing(true);
    try {
      const rawScore =
        draft.rawScore.trim() !== "" ? Number(draft.rawScore) : undefined;
      await overrideSectionScore(
        enrollmentId,
        skill as "listening" | "reading" | "writing" | "speaking",
        {
          band,
          ...(rawScore != null && !Number.isNaN(rawScore) ? { rawScore } : {}),
        },
      );
      toast("Score updated", {
        description: `${skill.charAt(0).toUpperCase() + skill.slice(1)} band set to ${band}.`,
        variant: "success",
      });
      await load();
      onUpdated?.();
    } catch (err) {
      toast("Update failed", {
        description: getErrorMessage(err, "Request failed"),
        variant: "error",
      });
    } finally {
      setActing(false);
    }
  }

  return (
    <Modal open onClose={onClose} ariaLabel="Enrollment scores">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading scores…
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-rose-600">{error}</p>
        ) : detail ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold text-muted">
                  {detail.enrollmentId}
                </p>
                <h2 className="mt-1 text-lg font-bold text-navy">
                  {detail.studentName}
                </h2>
                <p className="text-sm text-muted">{detail.packageTitle}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Overall</p>
                <p className="text-2xl font-bold text-navy">
                  {detail.overallBand ?? "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={acting}
                onClick={handleRescore}
              >
                <RefreshCw className="h-4 w-4" />
                Rescore L/R
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {detail.skills.map((skill) => {
                const mod = skill.skill as ModuleKey;
                const badge = moduleBadges[mod];
                const isAuto = mod === "listening" || mod === "reading";
                const draft = drafts[skill.skill] ?? { band: "", rawScore: "" };

                return (
                  <div
                    key={skill.skill}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                        <div>
                          <p className="text-sm font-semibold capitalize text-navy">
                            {skill.skill}
                          </p>
                          {skill.contentTest && (
                            <p className="text-xs text-muted">
                              {skill.contentTest.code}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted">
                        {skill.submitted ? "Submitted" : "Not submitted"}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div>
                        <label className="text-xs text-muted">Band</label>
                        <Input
                          type="number"
                          min={0}
                          max={9}
                          step={0.5}
                          value={draft.band}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [skill.skill]: {
                                ...prev[skill.skill],
                                band: e.target.value,
                              },
                            }))
                          }
                          className="mt-0.5 h-8 w-20"
                          disabled={!skill.submitted}
                        />
                      </div>
                      {isAuto && (
                        <div>
                          <label className="text-xs text-muted">Raw</label>
                          <Input
                            type="number"
                            min={0}
                            value={draft.rawScore}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [skill.skill]: {
                                  ...prev[skill.skill],
                                  rawScore: e.target.value,
                                },
                              }))
                            }
                            className="mt-0.5 h-8 w-20"
                            disabled={!skill.submitted}
                          />
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!skill.submitted || acting}
                        onClick={() => void handleSaveSkill(skill.skill)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
