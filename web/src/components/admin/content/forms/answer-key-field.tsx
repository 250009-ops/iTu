"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";

type Props = {
  questionNumber: number;
  answerKey: AnswerKeyMap;
  onChange: (key: AnswerKeyMap) => void;
  type?: "text" | "tfng" | "yng" | "option";
  options?: string[];
};

export function AnswerKeyField({
  questionNumber,
  answerKey,
  onChange,
  type = "text",
  options,
}: Props) {
  const key = String(questionNumber);
  const value = answerKey[key] ?? "";

  function set(v: string | string[]) {
    onChange({ ...answerKey, [key]: v });
  }

  if (type === "tfng") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => set(e.target.value)}
        className="h-8 rounded-md border border-border bg-white px-2 text-xs font-medium text-navy"
      >
        <option value="">—</option>
        <option value="TRUE">TRUE</option>
        <option value="FALSE">FALSE</option>
        <option value="NOT_GIVEN">NOT GIVEN</option>
      </select>
    );
  }

  if (type === "yng") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => set(e.target.value)}
        className="h-8 rounded-md border border-border bg-white px-2 text-xs font-medium text-navy"
      >
        <option value="">—</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
        <option value="NOT_GIVEN">NOT GIVEN</option>
      </select>
    );
  }

  if (type === "option" && options) {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => set(e.target.value)}
        className="h-8 rounded-md border border-border bg-white px-2 text-xs font-medium text-navy"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      value={typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : ""}
      onChange={(e) => set(e.target.value)}
      placeholder="Correct answer"
      className="h-8 text-xs"
    />
  );
}

export function AnswerKeyMultiField({
  numbers,
  answerKey,
  onChange,
  options,
}: {
  numbers: number[];
  answerKey: AnswerKeyMap;
  onChange: (key: AnswerKeyMap) => void;
  options: string[];
}) {
  const primary = numbers[0];
  const stored = answerKey[String(primary)];
  const selected = Array.isArray(stored)
    ? stored
    : typeof stored === "string" && stored
      ? stored.split(",").map((s) => s.trim())
      : [];

  function toggle(opt: string) {
    let next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    if (next.length > 2) next = next.slice(-2);
    const updated = { ...answerKey };
    for (const n of numbers) {
      updated[String(n)] = next;
    }
    onChange(updated);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`rounded-md border px-2 py-1 text-xs font-semibold ${
            selected.includes(opt)
              ? "border-navy bg-navy text-white"
              : "border-border bg-white text-muted"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
