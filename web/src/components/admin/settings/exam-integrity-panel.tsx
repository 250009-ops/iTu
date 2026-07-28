"use client";

import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { defaultExamIntegrityFlags } from "@/lib/admin/constants";
import { useAdminSettings } from "@/contexts/admin-settings-context";

export function ExamIntegrityPanel() {
  const { examIntegrity, setField } = useAdminSettings();
  const prefs = examIntegrity as Record<string, boolean | number>;

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Exam Integrity</h2>
        <p className="mt-0.5 text-sm text-muted">
          Control which client events are tracked during live exams and when a
          session is marked flagged. Save changes from the footer when done.
        </p>
      </div>

      <section className="mt-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-600">
          <ShieldAlert className="h-3.5 w-3.5" />
          Tracked events
        </div>
        <div className="mt-3 divide-y divide-border rounded-xl border border-border">
          {defaultExamIntegrityFlags.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-navy">{item.label}</p>
                <p className="mt-0.5 text-sm text-muted">{item.hint}</p>
              </div>
              <Switch
                checked={Boolean(prefs[item.id] ?? item.defaultOn)}
                onChange={(v) => setField("exam_integrity", item.id, v)}
                aria-label={item.label}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Flagging threshold
        </p>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
          <div>
            <p className="font-semibold text-navy">Max warnings before flag</p>
            <p className="mt-0.5 text-sm text-muted">
              Session is marked flagged after this many enabled integrity events.
            </p>
          </div>
          <Input
            type="number"
            min={1}
            max={20}
            value={Number(prefs.maxWarningsBeforeFlag ?? 1)}
            onChange={(e) =>
              setField(
                "exam_integrity",
                "maxWarningsBeforeFlag",
                Number(e.target.value),
              )
            }
            className="h-9 w-16 text-center"
          />
        </div>
      </section>
    </div>
  );
}
