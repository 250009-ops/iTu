"use client";

import { Input } from "@/components/ui/input";
import {
  EXAMINER_BANDS,
  mergeBandTiers,
  netExaminerPayout,
  type BandTiers,
  type ExaminerSkill,
} from "@/lib/examiner-rate-tiers";
import { formatPrice } from "@/lib/format-price";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";

const payoutOptions = [
  { value: "weekly", label: "Weekly (Mon)" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

const skills: { id: ExaminerSkill; label: string }[] = [
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Speaking" },
];

export function CommissionPanel() {
  const { commissionSettings, setField } = useAdminSettings();
  const bandTiers = mergeBandTiers(
    commissionSettings.bandTiers as Partial<BandTiers> | undefined,
  );

  function updateTierCell(
    band: string,
    skill: ExaminerSkill,
    field: "defaultRate" | "platformPercent",
    value: number,
  ) {
    const next = mergeBandTiers(bandTiers);
    next[band][skill] = {
      ...next[band][skill],
      [field]: value,
    };
    setField("commission", "bandTiers", next);
  }

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Commission &amp; Rates</h2>
        <p className="mt-0.5 text-sm text-muted">
          Default examiner rates by IELTS band. Final pay is confirmed when each
          examiner is approved. Student booking price does not change.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Band rate tiers
        </p>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="pb-2 pr-3">Band</th>
              <th className="pb-2 pr-3">Skill</th>
              <th className="pb-2 pr-3">Default rate (so&apos;m)</th>
              <th className="pb-2 pr-3">Platform %</th>
              <th className="pb-2">Examiner receives</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {EXAMINER_BANDS.map((band) =>
              skills.map((skill) => {
                const cell = bandTiers[band][skill.id];
                const net = netExaminerPayout(
                  cell.defaultRate,
                  cell.platformPercent,
                );
                return (
                  <tr key={`${band}-${skill.id}`}>
                    <td className="py-2.5 pr-3 font-semibold text-navy">
                      {band}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{skill.label}</td>
                    <td className="py-2.5 pr-3">
                      <Input
                        type="number"
                        min={1}
                        value={cell.defaultRate}
                        onChange={(e) =>
                          updateTierCell(
                            band,
                            skill.id,
                            "defaultRate",
                            Number(e.target.value),
                          )
                        }
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={cell.platformPercent}
                        onChange={(e) =>
                          updateTierCell(
                            band,
                            skill.id,
                            "platformPercent",
                            Number(e.target.value),
                          )
                        }
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="py-2.5 font-semibold text-emerald-700">
                      {formatPrice(net)}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Payout Schedule
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {payoutOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                opt.value === commissionSettings.payoutSchedule
                  ? "border-navy bg-navy/5 text-navy"
                  : "border-border text-muted hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name="payout"
                checked={opt.value === commissionSettings.payoutSchedule}
                onChange={() =>
                  setField("commission", "payoutSchedule", opt.value)
                }
                className="accent-navy"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
