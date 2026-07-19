import type {
  PracticeContentOptionPrompt,
  PracticeContentOptionUnit,
} from "@/lib/api/admin";

export type PracticePickerTab = "reading" | "listening" | "writing";

export const PICKER_UNIT_SECTIONS: {
  id: string;
  title: string;
  type: string;
  tab: PracticePickerTab;
}[] = [
  {
    id: "reading-passages",
    title: "Reading passages",
    type: "READING_PASSAGE",
    tab: "reading",
  },
  {
    id: "reading-drills",
    title: "Reading question-type drills",
    type: "READING_QUESTION_TYPE",
    tab: "reading",
  },
  {
    id: "listening-sections",
    title: "Listening sections",
    type: "LISTENING_SECTION",
    tab: "listening",
  },
  {
    id: "listening-drills",
    title: "Listening question-type drills",
    type: "LISTENING_QUESTION_TYPE",
    tab: "listening",
  },
];

export function deriveBundleFromSelection(
  unitIds: Set<string>,
  promptIds: Set<string>,
  units: PracticeContentOptionUnit[],
): Record<string, number> {
  const bundle: Record<string, number> = {};
  const unitMap = new Map(units.map((u) => [u.id, u]));

  for (const id of unitIds) {
    const unit = unitMap.get(id);
    if (!unit) continue;
    switch (unit.type) {
      case "READING_PASSAGE":
        bundle.readingPassages = (bundle.readingPassages ?? 0) + 1;
        break;
      case "READING_QUESTION_TYPE":
        bundle.readingQuestionTypes = (bundle.readingQuestionTypes ?? 0) + 1;
        break;
      case "LISTENING_SECTION":
        bundle.listeningSections = (bundle.listeningSections ?? 0) + 1;
        break;
      case "LISTENING_QUESTION_TYPE":
        bundle.listeningQuestionTypes = (bundle.listeningQuestionTypes ?? 0) + 1;
        break;
    }
  }

  if (promptIds.size > 0) {
    bundle.aiWritingEssays = promptIds.size;
  }

  return bundle;
}

export function formatBundleSummary(bundle: Record<string, number>): string {
  const parts: string[] = [];
  if (bundle.readingPassages) {
    parts.push(`${bundle.readingPassages} reading passages`);
  }
  if (bundle.readingQuestionTypes) {
    parts.push(`${bundle.readingQuestionTypes} reading drills`);
  }
  if (bundle.listeningSections) {
    parts.push(`${bundle.listeningSections} listening sections`);
  }
  if (bundle.listeningQuestionTypes) {
    parts.push(`${bundle.listeningQuestionTypes} listening drills`);
  }
  if (bundle.aiWritingEssays) {
    parts.push(`${bundle.aiWritingEssays} AI essays`);
  }
  return parts.join(" · ") || "—";
}

export function isUnitSelectable(
  unit: PracticeContentOptionUnit,
  selectedUnitIds: Set<string>,
  currentPackageId?: string,
): boolean {
  if (selectedUnitIds.has(unit.id)) return true;
  if (unit.status !== "published") return false;
  if (!unit.isAssigned) return true;
  return unit.assignedPackageId === currentPackageId;
}

export function isPromptSelectable(
  prompt: PracticeContentOptionPrompt,
  selectedPromptIds: Set<string>,
  currentPackageId?: string,
): boolean {
  if (selectedPromptIds.has(prompt.id)) return true;
  if (prompt.status !== "published") return false;
  if (!prompt.isAssigned) return true;
  return prompt.assignedPackageId === currentPackageId;
}
