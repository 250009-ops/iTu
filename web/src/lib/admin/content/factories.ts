import type {
  ListeningContent,
  ListeningPart,
  QuestionGroup,
  ReadingContent,
  ReadingPassage,
  SpeakingContent,
  WritingContent,
} from "@/lib/exam/types";
import { defaultMatchOptions } from "@/lib/admin/content/match-editor-helpers";
import { newId } from "@/lib/admin/content/utils";
import { defaultMatchingHeadingsInstruction } from "@/lib/exam/matching-headings";
import {
  defaultMatchingInformationHint,
  defaultMatchingInformationInstruction,
} from "@/lib/exam/matching-information";
import {
  defaultListeningMatchingHint,
  defaultMatchingFeaturesHint,
} from "@/lib/exam/matching-options";
import { passageSectionLabels } from "@/lib/exam/passage-sections";
import { gapNode } from "@/lib/exam/inline-content";

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
    part1Topics: [
      {
        title: "Introduction",
        questions: [
          "Can you tell me your full name, please?",
          "Where are you from?",
        ],
      },
      {
        title: "Work / study",
        questions: ["What do you do — work or study?"],
      },
      {
        title: "Free time",
        questions: ["What do you usually do in your free time?"],
      },
    ],
    part3Topics: [
      {
        title: "Importance & change",
        questions: [
          "Why do you think this topic is important?",
          "Has this changed in recent years?",
        ],
      },
      {
        title: "Future",
        questions: ["What might happen in the future?"],
      },
    ],
    part2ExaminerNotes: [
      "Give the candidate 1 minute to prepare.",
      "Ask them to speak for 1–2 minutes.",
      "Ask one or two rounding-off questions.",
    ],
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
  summary_completion_list: "Summary completion (from list)",
  sentence_completion: "Sentence completion",
  table_completion: "Table completion",
  mcq_single: "Multiple choice (single)",
  mcq_multi: "Multiple choice (choose multiple)",
  matching: "Matching",
  matching_headings: "Matching headings",
  matching_information: "Matching information",
  tfng: "True / False / Not Given",
  yng: "Yes / No / Not Given",
  map_labeling: "Map labeling",
  short_answer: "Short answer",
  flowchart_completion: "Flow-chart completion",
  instruction_screen: "Instruction screen",
  matching_features: "Matching features",
};

export function createQuestionGroup(
  type: QuestionGroup["type"],
  from: number,
  options?: { passageParagraphs?: { marker?: string }[] },
): QuestionGroup {
  const id = newId("group");
  const to = from;
  const passageSections = passageSectionLabels(options?.passageParagraphs);

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
      return {
        id,
        type,
        from,
        to,
        instruction:
          "Look at the following statements and the list of options below.",
        hint: defaultListeningMatchingHint(true),
        reuseOptions: true,
        options: defaultMatchOptions(5),
        questions: [{ n: from, prompt: "" }],
      };
    case "matching_headings": {
      const sectionLetters =
        passageSections.length > 0 ? passageSections : ["A"];
      return {
        id,
        type,
        from,
        to,
        instruction: defaultMatchingHeadingsInstruction(sectionLetters),
        hint: "Drag the correct heading into each section.",
        options: [
          { id: "i", label: "i. Heading one" },
          { id: "ii", label: "ii. Heading two" },
          { id: "iii", label: "iii. Heading three" },
          { id: "iv", label: "iv. Heading four" },
          { id: "v", label: "v. Heading five" },
          { id: "vi", label: "vi. Heading six" },
          { id: "vii", label: "vii. Extra heading" },
          { id: "viii", label: "viii. Extra heading" },
        ],
        questions: [
          {
            n: from,
            prompt: `Section ${sectionLetters[0]}`,
            section: sectionLetters[0],
          },
        ],
      };
    }
    case "matching_information":
      return {
        id,
        type,
        from,
        to,
        instruction: defaultMatchingInformationInstruction(passageSections),
        hint: defaultMatchingInformationHint(passageSections, false),
        reuseOptions: false,
        sectionLabels: passageSections,
        questions: [{ n: from, prompt: "" }],
      };
    case "summary_completion_list":
      return {
        id,
        type,
        from,
        to: from + 4,
        instruction: "Complete the summary below.",
        hint: "Choose the correct letter from the list for each answer.",
        title: "Summary title",
        options: defaultMatchOptions(10).map((o) => ({
          ...o,
          label: o.id === "A" ? "popular" : o.id === "B" ? "artistic" : `Option ${o.id}`,
        })),
        lines: [
          {
            style: "heading",
            nodes: ["Summary title"],
          },
          {
            style: "normal",
            nodes: [
              "The writer points out that ",
              { n: from },
              " is important, and that ",
              { n: from + 1 },
              " may also play a role.",
            ],
          },
        ],
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
        lines: [{ style: "normal", nodes: ["", { n: from }] }],
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
        selectionMode: "shared",
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
        answerMode: "option",
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
    case "flowchart_completion":
      return {
        id,
        type,
        from,
        to,
        instruction: "Complete the flow-chart below.",
        hint: "Choose SIX answers from the box and write the correct letter next to questions.",
        answerMode: "option",
        title: "Process overview",
        options: [
          { id: "A", label: "A. Step one" },
          { id: "B", label: "B. Step two" },
          { id: "C", label: "C. Step three" },
        ],
        nodes: [
          { kind: "text", text: "Start" },
          { kind: "gap", n: from },
          { kind: "text", text: "Finish" },
        ],
        steps: [
          {
            style: "normal",
            nodes: ["Start ", gapNode(from), " finish"],
          },
        ],
      };
    case "instruction_screen":
      return {
        id,
        type,
        from: 0,
        to: 0,
        instruction: "Part instructions",
        body: "You will hear a number of different recordings and you will have to answer questions on what you hear.\n\nThere will be time for you to read the questions and you will have a chance to check your work.\n\nAll the recordings will be played once only.",
        buttonLabel: "Next",
      };
    case "matching_features": {
      const options = defaultMatchOptions(7).map((o) => ({
        ...o,
        label: `Person ${o.id}`,
      }));
      return {
        id,
        type,
        from,
        to,
        instruction:
          "Look at the following statements and the list of people below.",
        hint: defaultMatchingFeaturesHint(options, true),
        reuseOptions: true,
        listTitle: "List of people",
        options,
        questions: [{ n: from, prompt: "" }],
      };
    }
  }
}
