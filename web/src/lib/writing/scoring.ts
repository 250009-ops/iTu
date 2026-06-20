import { bandOptions } from "@/lib/speaking/scoring";

export type WritingTaskKey = "task1" | "task2";
export type WritingCriterionId = "ta" | "cc" | "lr" | "gra";

export type TaskScores = {
  ta: number;
  cc: number;
  lr: number;
  gra: number;
};

export type TaskFeedback = {
  task1: string;
  task2: string;
};

export type WritingAnnotation = {
  start: number;
  end: number;
  criterion: WritingCriterionId;
  title: string;
  explanation: string;
  suggestion?: string;
};

export const WRITING_CRITERION_META: Record<
  WritingCriterionId,
  { label: string; short: string; tone: "sky" | "violet" | "emerald" | "amber" }
> = {
  ta: { label: "Task Achievement", short: "TA", tone: "sky" },
  cc: { label: "Coherence & Cohesion", short: "CC", tone: "violet" },
  lr: { label: "Lexical Resource", short: "LR", tone: "emerald" },
  gra: {
    label: "Grammatical Range & Accuracy",
    short: "GRA",
    tone: "amber",
  },
};

export const TASK1_CRITERION_LABELS: Record<WritingCriterionId, string> = {
  ta: "Task Achievement",
  cc: "Coherence & Cohesion",
  lr: "Lexical Resource",
  gra: "Grammatical Range & Accuracy",
};

export const TASK2_CRITERION_LABELS: Record<WritingCriterionId, string> = {
  ta: "Task Response",
  cc: "Coherence & Cohesion",
  lr: "Lexical Resource",
  gra: "Grammatical Range & Accuracy",
};

export function averageTaskBand(scores: TaskScores): number {
  const values = Object.values(scores);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 2) / 2;
}

export function computeWritingOverallBand(
  task1Band: number,
  task2Band: number,
): number {
  const weighted = (task1Band + task2Band * 2) / 3;
  return Math.round(weighted * 2) / 2;
}

export function defaultTaskScores(): TaskScores {
  return { ta: 7, cc: 7, lr: 7, gra: 7 };
}

export function toCriteriaPayload(
  task1: TaskScores,
  task2: TaskScores,
  feedback: TaskFeedback,
) {
  return {
    task1: {
      taskAchievement: task1.ta,
      coherenceCohesion: task1.cc,
      lexicalResource: task1.lr,
      grammar: task1.gra,
      taskBand: averageTaskBand(task1),
      feedback: feedback.task1.trim() || undefined,
    },
    task2: {
      taskResponse: task2.ta,
      coherenceCohesion: task2.cc,
      lexicalResource: task2.lr,
      grammar: task2.gra,
      taskBand: averageTaskBand(task2),
      feedback: feedback.task2.trim() || undefined,
    },
  };
}

export function fromCriteriaPayload(
  criteriaScores: Record<string, unknown> | null | undefined,
): {
  task1: TaskScores;
  task2: TaskScores;
  feedback: TaskFeedback;
} | null {
  if (!criteriaScores) return null;

  const task1Raw = criteriaScores.task1 as Record<string, number> | undefined;
  const task2Raw = criteriaScores.task2 as Record<string, number> | undefined;

  if (task1Raw && task2Raw) {
    return {
      task1: {
        ta: task1Raw.taskAchievement ?? 7,
        cc: task1Raw.coherenceCohesion ?? 7,
        lr: task1Raw.lexicalResource ?? 7,
        gra: task1Raw.grammar ?? 7,
      },
      task2: {
        ta: task2Raw.taskResponse ?? 7,
        cc: task2Raw.coherenceCohesion ?? 7,
        lr: task2Raw.lexicalResource ?? 7,
        gra: task2Raw.grammar ?? 7,
      },
      feedback: {
        task1:
          typeof (task1Raw as { feedback?: string }).feedback === "string"
            ? (task1Raw as { feedback?: string }).feedback!
            : "",
        task2:
          typeof (task2Raw as { feedback?: string }).feedback === "string"
            ? (task2Raw as { feedback?: string }).feedback!
            : "",
      },
    };
  }

  const flat = criteriaScores as Record<string, number>;
  if (
    typeof flat.taskAchievement === "number" ||
    typeof flat.coherenceCohesion === "number"
  ) {
    const shared: TaskScores = {
      ta: flat.taskAchievement ?? flat.taskResponse ?? 7,
      cc: flat.coherenceCohesion ?? 7,
      lr: flat.lexicalResource ?? 7,
      gra: flat.grammar ?? 7,
    };
    return {
      task1: shared,
      task2: shared,
      feedback: { task1: "", task2: "" },
    };
  }

  return null;
}

export function fromAiSuggestedScores(
  scores: Record<string, number> | null | undefined,
  task: WritingTaskKey,
): TaskScores | null {
  if (!scores) return null;
  const ta =
    task === "task1"
      ? scores.taskAchievement
      : scores.taskResponse ?? scores.taskAchievement;
  if (
    typeof ta !== "number" ||
    typeof scores.coherenceCohesion !== "number" ||
    typeof scores.lexicalResource !== "number" ||
    typeof scores.grammar !== "number"
  ) {
    return null;
  }
  return {
    ta,
    cc: scores.coherenceCohesion,
    lr: scores.lexicalResource,
    gra: scores.grammar,
  };
}

export { bandOptions };

export function formatSubmittedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

export function formatSla(minutes: number | null): {
  label: string;
  tone: "ok" | "warn" | "overdue";
} {
  if (minutes === null) return { label: "48h SLA", tone: "ok" };
  if (minutes > 0) {
    if (minutes < 60) {
      return {
        label: `${minutes}m left`,
        tone: minutes <= 240 ? "warn" : "ok",
      };
    }
    return {
      label: `${Math.ceil(minutes / 60)}h left`,
      tone: minutes <= 240 ? "warn" : "ok",
    };
  }
  const overdue = Math.abs(minutes);
  if (overdue < 60) return { label: `${overdue}m overdue`, tone: "overdue" };
  return { label: `${Math.ceil(overdue / 60)}h overdue`, tone: "overdue" };
}

export const CRITERION_TONE_CLASSES = {
  sky: {
    highlight: "bg-sky-200/70 underline decoration-sky-500 decoration-2 underline-offset-2",
    pill: "bg-sky-600 text-white",
    pillSoft: "bg-sky-50 text-sky-700 ring-sky-100",
    score: "text-sky-600",
  },
  violet: {
    highlight: "bg-violet-200/70 underline decoration-violet-500 decoration-2 underline-offset-2",
    pill: "bg-violet-600 text-white",
    pillSoft: "bg-violet-50 text-violet-700 ring-violet-100",
    score: "text-violet-600",
  },
  emerald: {
    highlight: "bg-emerald-200/70 underline decoration-emerald-500 decoration-2 underline-offset-2",
    pill: "bg-emerald-600 text-white",
    pillSoft: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    score: "text-emerald-600",
  },
  amber: {
    highlight: "bg-amber-200/70 underline decoration-amber-500 decoration-2 underline-offset-2",
    pill: "bg-amber-500 text-white",
    pillSoft: "bg-amber-50 text-amber-800 ring-amber-100",
    score: "text-amber-600",
  },
} as const;

export const CRITERION_ORDER: WritingCriterionId[] = ["ta", "cc", "lr", "gra"];
