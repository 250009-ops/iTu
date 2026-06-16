import type {
  ListeningContent,
  ListeningPart,
  QuestionGroup,
  ReadingContent,
  ReadingPassage,
  SpeakingContent,
  WritingContent,
} from "@/lib/exam/types";
import { newId } from "@/lib/admin/content/utils";

export function emptyReadingContent(title = "Reading"): ReadingContent {
  return {
    testId: "",
    title,
    totalQuestions: 0,
    durationMinutes: 60,
    passages: [emptyReadingPassage(1)],
  };
}

export function emptyReadingPassage(part: number): ReadingPassage {
  return {
    id: newId("r-passage"),
    part,
    title: `Passage ${part}`,
    blurb: `Read the text and answer questions.`,
    paragraphs: [{ marker: "A", text: "" }],
    groups: [],
  };
}

export function emptyListeningContent(title = "Listening"): ListeningContent {
  return {
    testId: "",
    title,
    totalQuestions: 0,
    durationMinutes: 32,
    audioTracks: [],
    parts: Array.from({ length: 4 }, (_, i) => emptyListeningPart(i + 1)),
  };
}

export function emptyListeningPart(part: number): ListeningPart {
  return {
    id: newId("l-part"),
    part,
    title: `Part ${part}`,
    blurb: `Listen and answer questions.`,
    groups: [],
  };
}

export function emptyWritingContent(title = "Writing"): WritingContent {
  return {
    testId: "",
    title,
    durationMinutes: 60,
    tasks: [
      {
        id: newId("w-task"),
        part: 1,
        taskNumber: 1,
        minutes: 20,
        minWords: 150,
        instruction:
          "You should spend about 20 minutes on this task. Write at least 150 words.",
        prompt: "",
      },
      {
        id: newId("w-task"),
        part: 2,
        taskNumber: 2,
        minutes: 40,
        minWords: 250,
        instruction:
          "You should spend about 40 minutes on this task. Write at least 250 words.",
        prompt: "",
      },
    ],
  };
}

export function emptySpeakingContent(title = "Speaking"): SpeakingContent {
  return {
    testId: "",
    examiner: "Examiner",
    examinerTitle: "Speaking Examiner · IELTS Certified",
    slot: "",
    parts: [
      {
        part: 1,
        title: "Introduction & interview",
        guidance: "4–5 minutes · familiar topics",
        durationSec: 300,
      },
      {
        part: 2,
        title: "Individual long turn",
        guidance: "1 min preparation · 2 min talk",
        durationSec: 180,
      },
      {
        part: 3,
        title: "Two-way discussion",
        guidance: "4–5 minutes · abstract questions",
        durationSec: 300,
      },
    ],
    cueCard: {
      title: "",
      bullets: ["", "", "", ""],
      prepSeconds: 60,
      speakSeconds: 120,
    },
  };
}

export function recomputeTotalQuestions(content: ReadingContent | ListeningContent): number {
  let max = 0;
  if ("passages" in content) {
    for (const p of content.passages) {
      for (const g of p.groups) {
        if (g.to > max) max = g.to;
      }
    }
  } else if ("parts" in content) {
    for (const p of content.parts) {
      for (const g of p.groups) {
        if (g.to > max) max = g.to;
      }
    }
  }
  content.totalQuestions = max;
  return max;
}

export const QUESTION_TYPE_LABELS: Record<QuestionGroup["type"], string> = {
  note_completion: "Note completion",
  form_completion: "Form completion",
  summary_completion: "Summary completion",
  sentence_completion: "Sentence completion",
  table_completion: "Table completion",
  mcq_single: "Multiple choice (single)",
  mcq_multi: "Multiple choice (choose two)",
  matching: "Matching",
  matching_headings: "Matching headings",
  tfng: "True / False / Not Given",
  yng: "Yes / No / Not Given",
  map_labeling: "Map labeling",
  short_answer: "Short answer",
};

export function createQuestionGroup(
  type: QuestionGroup["type"],
  from: number,
): QuestionGroup {
  const id = newId("group");
  const to = from;

  switch (type) {
    case "tfng":
    case "yng":
      return {
        id,
        type,
        from,
        to,
        instruction:
          type === "tfng"
            ? "Do the following statements agree with the information given in the text?"
            : "Do the following statements agree with the claims of the writer?",
        hint: type === "tfng" ? "Choose TRUE, FALSE or NOT GIVEN." : "Choose YES, NO or NOT GIVEN.",
        questions: [{ n: from, prompt: "" }],
      };
    case "mcq_single":
      return {
        id,
        type,
        from,
        to,
        instruction: "Choose the correct letter, A, B, C or D.",
        questions: [
          {
            n: from,
            prompt: "",
            options: [
              { id: "A", label: "" },
              { id: "B", label: "" },
              { id: "C", label: "" },
              { id: "D", label: "" },
            ],
          },
        ],
      };
    case "matching":
    case "matching_headings":
      return {
        id,
        type,
        from,
        to,
        instruction: "Match each item with the correct option.",
        hint: "Drag the correct letter next to each question.",
        options: [
          { id: "A", label: "Option A" },
          { id: "B", label: "Option B" },
        ],
        questions: [{ n: from, prompt: "" }],
      };
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "sentence_completion":
      return {
        id,
        type,
        from,
        to,
        instruction: "Complete the notes below.",
        hint: "Choose ONE WORD ONLY from the text for each answer.",
        title: "",
        lines: [["", { n: from }]],
      };
    case "mcq_multi":
      return {
        id,
        type,
        from,
        to: from + 1,
        instruction: "Choose TWO answers.",
        hint: "Choose TWO letters.",
        prompt: "",
        numbers: [from, from + 1],
        maxSelections: 2,
        options: [
          { id: "A", label: "" },
          { id: "B", label: "" },
          { id: "C", label: "" },
        ],
      };
    case "map_labeling":
      return {
        id,
        type,
        from,
        to,
        instruction: "Label the map below.",
        hint: "Drag the correct letter next to each location.",
        imageLabel: "Map",
        options: [
          { id: "A", label: "A" },
          { id: "B", label: "B" },
        ],
        zones: [{ n: from, x: 50, y: 50, label: "Location" }],
      };
    case "short_answer":
      return {
        id,
        type,
        from,
        to,
        instruction: "Answer the questions below.",
        questions: [{ n: from, prompt: "" }],
      };
    case "table_completion":
      return {
        id,
        type,
        from,
        to,
        instruction: "Complete the table.",
        columns: ["Column 1", "Column 2"],
        rows: [[["", { n: from }], [""]]],
      };
  }
}
