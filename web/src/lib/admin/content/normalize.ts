import type { ContentModule } from "@/lib/admin/types";
import {
  emptyListeningContent,
  emptyReadingContent,
  emptySpeakingContent,
  emptyWritingContent,
} from "@/lib/admin/content/factories";
import type {
  ListeningContent,
  ListeningPart,
  QuestionGroup,
  ReadingContent,
  ReadingPassage,
  SpeakingContent,
  WritingContent,
} from "@/lib/exam/types";

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? value : fallback;
}

function repairQuestionGroup(group: QuestionGroup): QuestionGroup {
  const g = group;
  switch (g.type) {
    case "map_labeling":
      return {
        ...g,
        options: asArray(g.options),
        zones: asArray(g.zones),
      };
    case "matching":
    case "matching_headings":
      return {
        ...g,
        options: asArray(g.options),
        questions: asArray(g.questions),
      };
    case "mcq_single":
      return { ...g, questions: asArray(g.questions) } as QuestionGroup;
    case "short_answer":
    case "tfng":
    case "yng":
      return { ...g, questions: asArray(g.questions) };
    case "mcq_multi":
      return {
        ...g,
        options: asArray(g.options),
        numbers: asArray(g.numbers),
      };
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "sentence_completion":
      return { ...g, lines: asArray(g.lines) };
    case "table_completion":
      return {
        ...g,
        columns: asArray(g.columns),
        rows: asArray(g.rows),
      };
    default:
      return g;
  }
}

function repairPassage(passage: ReadingPassage): ReadingPassage {
  return {
    ...passage,
    paragraphs: asArray(passage.paragraphs, [{ text: "" }]),
    groups: asArray(passage.groups).map((g) => repairQuestionGroup(g as QuestionGroup)),
  };
}

function repairListeningPart(part: ListeningPart): ListeningPart {
  return {
    ...part,
    groups: asArray(part.groups).map((g) => repairQuestionGroup(g as QuestionGroup)),
  };
}

function repairReadingContent(raw: object): ReadingContent {
  const c = raw as ReadingContent;
  const passages = asArray(c.passages);
  if (passages.length === 0) {
    return emptyReadingContent(typeof c.title === "string" ? c.title : "Reading");
  }
  return {
    ...c,
    passages: passages.map((p) => repairPassage(p as ReadingPassage)),
  };
}

function repairListeningContent(raw: object): ListeningContent {
  const c = raw as ListeningContent;
  const parts = asArray(c.parts);
  if (parts.length === 0) {
    return emptyListeningContent(typeof c.title === "string" ? c.title : "Listening");
  }
  return {
    ...c,
    audioTracks: asArray(c.audioTracks),
    parts: parts.map((p) => repairListeningPart(p as ListeningPart)),
  };
}

function repairWritingContent(raw: object): WritingContent {
  const c = raw as WritingContent;
  const tasks = asArray(c.tasks);
  if (tasks.length === 0) {
    return emptyWritingContent(typeof c.title === "string" ? c.title : "Writing");
  }
  return { ...c, tasks: tasks as WritingContent["tasks"] };
}

function repairSpeakingContent(raw: object): SpeakingContent {
  const c = raw as SpeakingContent;
  const parts = asArray(c.parts);
  const cueCard = c.cueCard ?? { title: "", bullets: [""], prepSeconds: 60, speakSeconds: 120 };
  if (parts.length === 0) {
    return emptySpeakingContent();
  }
  return {
    ...c,
    parts: parts as SpeakingContent["parts"],
    cueCard: {
      ...cueCard,
      bullets: asArray(cueCard.bullets, [""]),
    },
    part1Questions: asArray(c.part1Questions),
    part3Questions: asArray(c.part3Questions),
    part2ExaminerNotes: asArray(c.part2ExaminerNotes),
  };
}

export function normalizeContent(module: ContentModule, raw: object): object {
  switch (module) {
    case "reading":
      return repairReadingContent(raw);
    case "listening":
      return repairListeningContent(raw);
    case "writing":
      return repairWritingContent(raw);
    case "speaking":
      return repairSpeakingContent(raw);
  }
}
