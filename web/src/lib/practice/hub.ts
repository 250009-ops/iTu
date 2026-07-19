import type { PracticeLibraryUnit, PracticeWallet } from "@/lib/api/practice";

export type PracticeHubTab = "reading" | "listening" | "writing";

export type PracticeCreditKey = keyof PracticeWallet;

export const PRACTICE_CREDIT_META: Record<
  PracticeCreditKey,
  { label: string; shortLabel: string; color: string }
> = {
  readingPassages: {
    label: "Reading passages",
    shortLabel: "Passages",
    color: "#10b981",
  },
  readingQuestionTypes: {
    label: "Reading question types",
    shortLabel: "Q-type drills",
    color: "#059669",
  },
  listeningSections: {
    label: "Listening sections",
    shortLabel: "Sections",
    color: "#0ea5e9",
  },
  listeningQuestionTypes: {
    label: "Listening question types",
    shortLabel: "Q-type drills",
    color: "#0284c7",
  },
  aiWritingEssays: {
    label: "AI writing reviews",
    shortLabel: "Essay credits",
    color: "#8b5cf6",
  },
};

export type PracticeLibrarySection = {
  id: string;
  title: string;
  description: string;
  tab: PracticeHubTab;
  creditKey: PracticeCreditKey;
  unitTypes: string[];
};

export const PRACTICE_LIBRARY_SECTIONS: PracticeLibrarySection[] = [
  {
    id: "reading-passages",
    title: "Reading passages",
    description: "Full passages with mixed question types — 1 passage credit each.",
    tab: "reading",
    creditKey: "readingPassages",
    unitTypes: ["READING_PASSAGE"],
  },
  {
    id: "reading-drills",
    title: "Reading question-type drills",
    description: "Focused drills on one question format — 1 drill credit each.",
    tab: "reading",
    creditKey: "readingQuestionTypes",
    unitTypes: ["READING_QUESTION_TYPE"],
  },
  {
    id: "listening-sections",
    title: "Listening sections",
    description: "Audio sections with mixed questions — 1 section credit each.",
    tab: "listening",
    creditKey: "listeningSections",
    unitTypes: ["LISTENING_SECTION"],
  },
  {
    id: "listening-drills",
    title: "Listening question-type drills",
    description: "Single-format listening drills — 1 drill credit each.",
    tab: "listening",
    creditKey: "listeningQuestionTypes",
    unitTypes: ["LISTENING_QUESTION_TYPE"],
  },
];

export function creditTypeToWalletKey(creditType: string): PracticeCreditKey {
  switch (creditType) {
    case "READING_PASSAGE":
      return "readingPassages";
    case "READING_QUESTION_TYPE":
      return "readingQuestionTypes";
    case "LISTENING_SECTION":
      return "listeningSections";
    case "LISTENING_QUESTION_TYPE":
      return "listeningQuestionTypes";
    case "AI_WRITING_ESSAY":
      return "aiWritingEssays";
    default:
      return "readingPassages";
  }
}

export function walletKeyForUnit(unit: PracticeLibraryUnit): PracticeCreditKey {
  return creditTypeToWalletKey(unit.creditType);
}

export function hasCreditsForUnit(
  wallet: PracticeWallet,
  unit: PracticeLibraryUnit,
): boolean {
  return wallet[walletKeyForUnit(unit)] > 0;
}

export function totalPracticeCredits(wallet: PracticeWallet): number {
  return (
    wallet.readingPassages +
    wallet.readingQuestionTypes +
    wallet.listeningSections +
    wallet.listeningQuestionTypes +
    wallet.aiWritingEssays
  );
}

export function groupLibraryBySection(
  library: PracticeLibraryUnit[],
  section: PracticeLibrarySection,
): PracticeLibraryUnit[] {
  return library.filter((unit) => section.unitTypes.includes(unit.type));
}

export function formatUnitType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase();
}

export function formatAttemptStatus(status: string): string {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "abandoned":
      return "Abandoned";
    default:
      return status.replace(/_/g, " ");
  }
}
