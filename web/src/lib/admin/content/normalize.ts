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
  SpeakingPart1Topic,
  WritingContent,
} from "@/lib/exam/types";
import {
  normalizeCompletionLines,
  normalizeFlowchartSteps,
} from "@/lib/exam/inline-content";
import { normalizeMatchingHeadingsGroup } from "@/lib/exam/matching-headings";
import { normalizeMcqSingleGroup } from "@/lib/exam/mcq-single";
import {
  normalizeMcqMultiSharedGroup,
  syncMcqChooseNMeta,
  syncMcqMultiSharedMeta,
} from "@/lib/exam/mcq-choose-n";

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? value : fallback;
}

function repairQuestionGroup(group: QuestionGroup): QuestionGroup {
  const g = group;
  switch (g.type) {
    case "map_labeling":
      return {
        ...g,
        layoutMode: g.layoutMode === "place_list" ? "place_list" : "zones",
        answerMode: g.answerMode === "text" ? "text" : "option",
        reuseOptions:
          g.reuseOptions !== false &&
          (g.reuseOptions === true ||
            /NB\s+You may use any letter more than once/i.test(String(g.hint ?? ""))),
        options: asArray(g.options),
        zones: asArray(g.zones),
        mapMarkers: asArray(g.mapMarkers),
        questions: asArray(g.questions),
      };
    case "matching":
      return {
        ...g,
        reuseOptions: g.reuseOptions !== false && (g.reuseOptions === true || /NB\s+You may use any letter more than once/i.test(String(g.hint ?? ""))),
        options: asArray(g.options),
        questions: asArray(g.questions),
      };
    case "matching_headings":
      return normalizeMatchingHeadingsGroup({
        ...g,
        options: asArray(g.options),
        questions: asArray(g.questions),
      });
    case "matching_features":
      return {
        ...g,
        reuseOptions: g.reuseOptions !== false && (g.reuseOptions === true || /NB\s+You may use any letter more than once/i.test(String(g.hint ?? ""))),
        options: asArray(g.options),
        questions: asArray(g.questions),
      };
    case "flowchart_completion": {
      const steps = normalizeFlowchartSteps({
        steps: g.steps,
        nodes: g.nodes,
      });
      return {
        ...g,
        answerMode: g.answerMode === "text" ? "text" : "option",
        options: asArray(g.options),
        steps,
      };
    }
    case "summary_completion_list":
      return {
        ...g,
        options: asArray(g.options),
        lines: normalizeCompletionLines(g.lines),
      };
    case "instruction_screen":
      return { ...g, body: g.body ?? g.instruction ?? "" };
    case "matching_information":
      return {
        ...g,
        reuseOptions:
          g.reuseOptions !== false &&
          (g.reuseOptions === true ||
            /NB\s+You may use any letter more than once/i.test(String(g.hint ?? ""))),
        questions: asArray(g.questions),
        sectionLabels: asArray(g.sectionLabels),
      };
    case "mcq_single":
      return normalizeMcqSingleGroup({
        ...g,
        questions: asArray(g.questions),
      });
    case "short_answer":
    case "tfng":
    case "yng":
      return { ...g, questions: asArray(g.questions) };
    case "mcq_multi": {
      const selectionMode =
        g.selectionMode === "per_question" ? "per_question" : "shared";
      const base = {
        ...g,
        selectionMode,
        answerOrdering: g.answerOrdering === "fixed" ? "fixed" : "any",
        options: asArray(g.options),
        numbers: asArray<number>(g.numbers),
      } as QuestionGroup;
      if (selectionMode === "per_question") {
        return base;
      }
      return syncMcqMultiSharedMeta(base as import("@/lib/exam/types").McqMultiGroup);
    }
    case "mcq_choose_n": {
      const options = asArray<{ id: string; label: string }>(g.options);
      const from = typeof g.from === "number" ? g.from : 1;
      const chooseCount = Math.max(
        2,
        Math.min(
          options.length || 6,
          typeof g.chooseCount === "number"
            ? g.chooseCount
            : typeof g.to === "number" && g.to > from
              ? g.to - from + 1
              : 3,
        ),
      );
      return syncMcqChooseNMeta({
        ...g,
        type: "mcq_choose_n",
        options,
        chooseCount,
        from,
        to: from,
      } as import("@/lib/exam/types").McqChooseNGroup) as QuestionGroup;
    }
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "sentence_completion":
      return { ...g, lines: normalizeCompletionLines(g.lines) };
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

function repairListeningPart(part: ListeningPart, index: number): ListeningPart {
  const fallbackId = `part-${part.part || index + 1}`;
  return {
    ...part,
    id: (part.id && String(part.id).trim()) || fallbackId,
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
  const seen = new Set<string>();
  return {
    ...c,
    audioTracks: asArray(c.audioTracks),
    parts: parts.map((p, index) => {
      const repaired = repairListeningPart(p as ListeningPart, index);
      let id = repaired.id;
      if (seen.has(id)) id = `part-${repaired.part || index + 1}-${index}`;
      seen.add(id);
      return { ...repaired, id };
    }),
  };
}

function repairWritingContent(raw: object): WritingContent {
  const c = raw as WritingContent;
  const tasks = asArray(c.tasks);
  if (tasks.length === 0) {
    return emptyWritingContent(typeof c.title === "string" ? c.title : "Writing");
  }
  // newId() used Date.now() only; Task 1+2 created in the same ms shared one id,
  // which collapsed exam navigation and essay/word-count state onto Task 1.
  const seen = new Set<string>();
  return {
    ...c,
    tasks: (tasks as WritingContent["tasks"]).map((task, index) => {
      const taskNumber =
        typeof task.taskNumber === "number" && task.taskNumber > 0
          ? task.taskNumber
          : index + 1;
      let id = (task.id && String(task.id).trim()) || `w-task-${taskNumber}`;
      if (seen.has(id)) id = `w-task-${taskNumber}-${index}`;
      seen.add(id);
      return { ...task, id, taskNumber };
    }),
  };
}

function repairTopicGroups(
  c: SpeakingContent,
  topicsKey: "part1Topics" | "part3Topics",
  legacyKey: "part1Questions" | "part3Questions",
  legacyTitle: string,
): SpeakingPart1Topic[] {
  const rawTopics = asArray(c[topicsKey]) as Partial<SpeakingPart1Topic>[];
  const topics = rawTopics
    .map((topic) => ({
      title: typeof topic.title === "string" ? topic.title : "",
      questions: asArray(topic.questions, [""]),
    }))
    .filter((topic) => topic.title.trim() || topic.questions.some((q) => q.trim()));

  if (topics.length > 0) return topics;

  const legacy = asArray(c[legacyKey]).filter(
    (q): q is string => typeof q === "string" && q.trim().length > 0,
  );
  if (legacy.length > 0) {
    return [{ title: legacyTitle, questions: legacy }];
  }

  return [];
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
    part1Topics: repairTopicGroups(c, "part1Topics", "part1Questions", "General questions"),
    part3Topics: repairTopicGroups(c, "part3Topics", "part3Questions", "General discussion"),
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
