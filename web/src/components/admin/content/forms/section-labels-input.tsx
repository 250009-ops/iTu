"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  formatSectionLabelsInput,
  parseSectionLabelsInput,
} from "@/lib/exam/passage-sections";

type Props = {
  value: string[] | undefined;
  onChange: (labels: string[]) => void;
  placeholder?: string;
};

/** Comma-separated section letters — commits on blur so typing "A, B, C" works. */
export function SectionLabelsInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState(() => formatSectionLabelsInput(value));

  useEffect(() => {
    setDraft(formatSectionLabelsInput(value));
  }, [value]);

  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onChange(parseSectionLabelsInput(draft))}
      placeholder={placeholder ?? "A, B, C, D, E, F"}
    />
  );
}
