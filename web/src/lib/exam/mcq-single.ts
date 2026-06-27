import type { McqSingleGroup, Option } from "@/lib/exam/types";

function normalizeOptions(options: Option[] | undefined): Option[] {
  return (options ?? [])
    .map((o) => ({
      id: String(o.id ?? "").trim(),
      label: String(o.label ?? "").trim(),
    }))
    .filter((o) => o.id);
}

export function normalizeMcqSingleGroup(group: McqSingleGroup): McqSingleGroup {
  let example = group.example;
  if (example) {
    const options = normalizeOptions(example.options);
    let answerId = String(example.answerId ?? "").trim();
    if (!options.some((o) => o.id === answerId)) {
      answerId = options[0]?.id ?? "";
    }
    if (!answerId || options.length < 2) {
      example = undefined;
    } else {
      example = {
        prompt: String(example.prompt ?? "").trim(),
        options,
        answerId,
      };
    }
  }

  return {
    ...group,
    example,
    questions: (group.questions ?? []).map((q) => ({
      ...q,
      prompt: q.prompt ?? "",
      options: normalizeOptions(q.options),
    })),
  };
}
