import { ContentTestType } from '@prisma/client';

/**
 * Server-side structural normalization for content-test JSON.
 *
 * The student exam players iterate over array fields like `group.nodes`,
 * `group.lines[].nodes`, `group.rows`, etc. Admin-authored or imported JSON
 * can leave these fields `undefined`/non-array, which crashes the player with
 * `s.nodes is not iterable`. We repair the shape here so the API never serves
 * (and never publishes) content that can break the runtime.
 */

type Json = Record<string, unknown>;

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Coerce legacy `InlineNode[][]` or `CompletionLine[]` into structured lines. */
function normalizeCompletionLines(raw: unknown): Json[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((line) => {
    if (Array.isArray(line)) {
      return { style: 'normal', nodes: line };
    }
    if (isObject(line) && 'nodes' in line) {
      return {
        ...line,
        style: typeof line.style === 'string' ? line.style : 'normal',
        nodes: asArray(line.nodes),
      };
    }
    return { style: 'normal', nodes: [] };
  });
}

function resolveMatchingSection(question: Json, fallback?: string): string {
  const section = typeof question.section === 'string' ? question.section.trim() : '';
  if (section) return section.toUpperCase();
  const prompt = typeof question.prompt === 'string' ? question.prompt : '';
  const fromPrompt = prompt.match(/section\s+([A-Z])/i)?.[1];
  if (fromPrompt) return fromPrompt.toUpperCase();
  return fallback?.toUpperCase() ?? '';
}

function normalizeMatchingHeadingsGroup(group: Json): Json {
  const rawQuestions = asArray<Json>(group.questions);
  const legacyExample = rawQuestions.find((q) => q.isExample === true);
  let example = isObject(group.example) ? group.example : undefined;

  if (legacyExample && !example) {
    const section = resolveMatchingSection(legacyExample);
    const headingId =
      typeof legacyExample.exampleHeadingId === 'string'
        ? legacyExample.exampleHeadingId.trim()
        : '';
    if (section && headingId) {
      example = { section, headingId };
    }
  } else if (example) {
    const section =
      typeof example.section === 'string' ? example.section.trim().toUpperCase() : '';
    const headingId =
      typeof example.headingId === 'string' ? example.headingId.trim() : '';
    example = section && headingId ? { section, headingId } : undefined;
  }

  const exampleSection =
    example && typeof example.section === 'string'
      ? example.section.trim().toUpperCase()
      : undefined;

  const questions = rawQuestions
    .filter((q) => q.isExample !== true)
    .map((q) => ({
      n: q.n,
      prompt: q.prompt,
      section: q.section,
    }))
    .filter((q) => {
      if (!exampleSection) return true;
      return resolveMatchingSection(q) !== exampleSection;
    });

  return { ...group, example, questions };
}

function repairQuestionGroup(group: unknown): Json {
  if (!isObject(group)) {
    return { type: 'instruction_screen', body: '' };
  }
  const g = group;
  switch (g.type) {
    case 'map_labeling':
      return {
        ...g,
        answerMode: g.answerMode === 'text' ? 'text' : 'option',
        options: asArray(g.options),
        zones: asArray(g.zones),
      };
    case 'matching':
    case 'matching_features':
      return {
        ...g,
        options: asArray(g.options),
        questions: asArray(g.questions),
      };
    case 'matching_headings':
      return normalizeMatchingHeadingsGroup({
        ...g,
        options: asArray(g.options),
        questions: asArray(g.questions),
      });
    case 'flowchart_completion':
      return {
        ...g,
        answerMode: g.answerMode === 'text' ? 'text' : 'option',
        options: asArray(g.options),
        nodes: asArray(g.nodes),
      };
    case 'summary_completion_list':
      return {
        ...g,
        options: asArray(g.options),
        lines: normalizeCompletionLines(g.lines),
      };
    case 'instruction_screen':
      return { ...g, body: g.body ?? g.instruction ?? '' };
    case 'matching_information':
      return {
        ...g,
        questions: asArray(g.questions),
        sectionLabels: asArray(g.sectionLabels),
      };
    case 'mcq_single':
    case 'short_answer':
    case 'tfng':
    case 'yng':
      return { ...g, questions: asArray(g.questions) };
    case 'mcq_multi':
      return {
        ...g,
        selectionMode: g.selectionMode === 'per_question' ? 'per_question' : 'shared',
        answerOrdering: g.answerOrdering === 'fixed' ? 'fixed' : 'any',
        options: asArray(g.options),
        numbers: asArray(g.numbers),
      };
    case 'note_completion':
    case 'form_completion':
    case 'summary_completion':
    case 'sentence_completion':
      return { ...g, lines: normalizeCompletionLines(g.lines) };
    case 'table_completion':
      return {
        ...g,
        columns: asArray(g.columns),
        rows: asArray(g.rows).map((row) =>
          asArray(row).map((cell) => asArray(cell)),
        ),
      };
    default:
      return g;
  }
}

function repairListeningContent(c: Json): Json {
  return {
    ...c,
    audioTracks: asArray(c.audioTracks),
    parts: asArray<Json>(c.parts).map((part) => ({
      ...part,
      groups: asArray(part.groups).map(repairQuestionGroup),
    })),
  };
}

function repairReadingContent(c: Json): Json {
  return {
    ...c,
    passages: asArray<Json>(c.passages).map((passage) => ({
      ...passage,
      paragraphs: Array.isArray(passage.paragraphs)
        ? passage.paragraphs
        : [{ text: '' }],
      groups: asArray(passage.groups).map(repairQuestionGroup),
    })),
  };
}

function repairWritingContent(c: Json): Json {
  return { ...c, tasks: asArray(c.tasks) };
}

function repairSpeakingContent(c: Json): Json {
  return {
    ...c,
    parts: asArray(c.parts),
    part1Questions: asArray(c.part1Questions),
    part3Questions: asArray(c.part3Questions),
    part2ExaminerNotes: asArray(c.part2ExaminerNotes),
  };
}

/** Returns a structurally safe copy of the content for the given test type. */
export function normalizeContentForType(
  type: ContentTestType,
  content: unknown,
): Json {
  const c = isObject(content) ? content : {};
  switch (type) {
    case ContentTestType.LISTENING:
      return repairListeningContent(c);
    case ContentTestType.READING:
      return repairReadingContent(c);
    case ContentTestType.WRITING:
      return repairWritingContent(c);
    case ContentTestType.SPEAKING:
      return repairSpeakingContent(c);
    default:
      return c;
  }
}

/**
 * Validates that L/R content has no structurally broken question groups.
 * Returns a list of human-readable problems (empty when valid).
 */
export function findContentStructureErrors(
  type: ContentTestType,
  content: unknown,
): string[] {
  const errors: string[] = [];
  const c = isObject(content) ? content : {};

  const checkGroups = (groups: unknown, location: string) => {
    asArray(groups).forEach((group, idx) => {
      if (!isObject(group)) {
        errors.push(`${location} group #${idx + 1} is not an object`);
        return;
      }
      const where = `${location} group "${String(group.id ?? idx + 1)}"`;
      switch (group.type) {
        case 'flowchart_completion':
          if (!Array.isArray(group.nodes)) {
            errors.push(`${where} is missing a valid "nodes" array`);
          }
          if (!Array.isArray(group.options)) {
            errors.push(`${where} is missing a valid "options" array`);
          }
          break;
        case 'note_completion':
        case 'form_completion':
        case 'summary_completion':
        case 'sentence_completion':
        case 'summary_completion_list':
          if (!Array.isArray(group.lines)) {
            errors.push(`${where} is missing a valid "lines" array`);
          }
          break;
        case 'table_completion':
          if (!Array.isArray(group.rows)) {
            errors.push(`${where} is missing a valid "rows" array`);
          }
          break;
        default:
          break;
      }
    });
  };

  if (type === ContentTestType.LISTENING) {
    asArray<Json>(c.parts).forEach((part, i) =>
      checkGroups(part.groups, `Part ${i + 1}`),
    );
  } else if (type === ContentTestType.READING) {
    asArray<Json>(c.passages).forEach((passage, i) =>
      checkGroups(passage.groups, `Passage ${i + 1}`),
    );
  }

  return errors;
}
