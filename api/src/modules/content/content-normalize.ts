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

type FlowchartNode = { kind: 'text' | 'gap'; text?: string; n?: number };

function migrateFlowchartNodesToSteps(nodes: FlowchartNode[]): Json[] {
  if (nodes.length === 0) {
    return [{ style: 'normal', nodes: [''] }];
  }

  const steps: Json[] = [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i]!;
    if (node.kind === 'text') {
      if (
        i + 2 < nodes.length &&
        nodes[i + 1]?.kind === 'gap' &&
        nodes[i + 2]?.kind === 'text'
      ) {
        steps.push({
          style: 'normal',
          nodes: [
            node.text ?? '',
            { n: nodes[i + 1]!.n },
            nodes[i + 2]!.text ?? '',
          ],
        });
        i += 3;
        continue;
      }
      steps.push({ style: 'normal', nodes: [node.text ?? ''] });
      i += 1;
      continue;
    }

    if (i + 1 < nodes.length && nodes[i + 1]?.kind === 'text') {
      steps.push({
        style: 'normal',
        nodes: [{ n: node.n }, nodes[i + 1]!.text ?? ''],
      });
      i += 2;
      continue;
    }

    steps.push({ style: 'normal', nodes: [{ n: node.n }] });
    i += 1;
  }
  return steps;
}

function normalizeFlowchartSteps(raw: {
  steps?: unknown;
  nodes?: unknown;
}): Json[] {
  const steps = normalizeCompletionLines(raw.steps);
  if (steps.some((line) => asArray(line.nodes).length > 0)) {
    return steps;
  }
  const nodes = asArray<FlowchartNode>(raw.nodes);
  if (nodes.length > 0) {
    return migrateFlowchartNodesToSteps(nodes);
  }
  return [{ style: 'normal', nodes: [''] }];
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

function normalizeOptions(raw: unknown): Json[] {
  return asArray<Json>(raw)
    .map((o) => ({
      id: typeof o.id === 'string' ? o.id.trim() : String(o.id ?? '').trim(),
      label: typeof o.label === 'string' ? o.label : '',
    }))
    .filter((o) => o.id);
}

function normalizeMcqSingleGroup(group: Json): Json {
  let example = isObject(group.example) ? group.example : undefined;

  if (example) {
    const options = normalizeOptions(example.options);
    let answerId =
      typeof example.answerId === 'string' ? example.answerId.trim() : '';
    if (!options.some((o) => o.id === answerId)) {
      answerId = typeof options[0]?.id === 'string' ? options[0].id : '';
    }
    if (!answerId || options.length < 2) {
      example = undefined;
    } else {
      example = {
        prompt: typeof example.prompt === 'string' ? example.prompt : '',
        options,
        answerId,
      };
    }
  }

  return {
    ...group,
    example,
    questions: asArray<Json>(group.questions).map((q) => ({
      ...q,
      prompt: typeof q.prompt === 'string' ? q.prompt : '',
      options: normalizeOptions(q.options),
    })),
  };
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
        layoutMode: g.layoutMode === 'place_list' ? 'place_list' : 'zones',
        answerMode: g.answerMode === 'text' ? 'text' : 'option',
        reuseOptions:
          g.reuseOptions !== false &&
          (g.reuseOptions === true ||
            /NB\s+You may use any letter more than once/i.test(String(g.hint ?? ''))),
        options: asArray(g.options),
        zones: asArray(g.zones),
        mapMarkers: asArray(g.mapMarkers),
        questions: asArray(g.questions),
      };
    case 'matching':
    case 'matching_features':
      return {
        ...g,
        reuseOptions:
          g.reuseOptions !== false &&
          (g.reuseOptions === true ||
            /NB\s+You may use any letter more than once/i.test(String(g.hint ?? ''))),
        options: asArray(g.options),
        questions: asArray(g.questions),
      };
    case 'matching_headings':
      return normalizeMatchingHeadingsGroup({
        ...g,
        options: asArray(g.options),
        questions: asArray(g.questions),
      });
    case 'flowchart_completion': {
      const steps = normalizeFlowchartSteps({
        steps: g.steps,
        nodes: g.nodes,
      });
      return {
        ...g,
        answerMode: g.answerMode === 'text' ? 'text' : 'option',
        options: asArray(g.options),
        steps,
      };
    }
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
      return normalizeMcqSingleGroup({ ...g, questions: asArray(g.questions) });
    case 'short_answer':
    case 'tfng':
    case 'yng':
      return { ...g, questions: asArray(g.questions) };
    case 'mcq_multi':
      if (g.selectionMode === 'per_question') {
        return {
          ...g,
          selectionMode: 'per_question',
          answerOrdering: g.answerOrdering === 'fixed' ? 'fixed' : 'any',
          options: asArray(g.options),
          numbers: asArray(g.numbers),
        };
      }
      {
        const numbers = asArray<number>(g.numbers);
        const from = typeof g.from === 'number' ? g.from : (numbers[0] ?? 1);
        const maxSelections =
          typeof g.maxSelections === 'number' && g.maxSelections >= 2
            ? g.maxSelections
            : Math.max(2, numbers.length);
        const sharedNumbers = Array.from(
          { length: maxSelections },
          (_, i) => from + i,
        );
        return {
          ...g,
          selectionMode: 'shared',
          answerOrdering: g.answerOrdering === 'fixed' ? 'fixed' : 'any',
          options: asArray(g.options),
          from,
          to: from + maxSelections - 1,
          numbers: sharedNumbers,
          maxSelections,
        };
      }
    case 'mcq_choose_n': {
      const options = asArray(g.options);
      const from = typeof g.from === 'number' ? g.from : 1;
      const chooseCount = Math.max(
        2,
        Math.min(
          options.length || 6,
          typeof g.chooseCount === 'number'
            ? g.chooseCount
            : typeof g.to === 'number' && g.to > from
              ? g.to - from + 1
              : 3,
        ),
      );
      return {
        ...g,
        options,
        chooseCount,
        from,
        to: from,
      };
    }
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

function repairTopicGroups(
  c: Json,
  topicsKey: 'part1Topics' | 'part3Topics',
  legacyKey: 'part1Questions' | 'part3Questions',
  legacyTitle: string,
): Json[] {
  const rawTopics = asArray(c[topicsKey]) as Json[];
  const topics = rawTopics
    .map((topic) => {
      if (!isObject(topic)) return null;
      const title = typeof topic.title === 'string' ? topic.title : '';
      const questions = asArray(topic.questions).filter(
        (q) => typeof q === 'string' && q.trim(),
      );
      if (!title.trim() && questions.length === 0) return null;
      return { title, questions: questions.length ? questions : [''] };
    })
    .filter(Boolean) as Json[];

  if (topics.length > 0) return topics;

  const legacy = asArray(c[legacyKey]).filter(
    (q) => typeof q === 'string' && q.trim(),
  );
  if (legacy.length > 0) {
    return [{ title: legacyTitle, questions: legacy }];
  }

  return [];
}

function repairSpeakingContent(c: Json): Json {
  return {
    ...c,
    parts: asArray(c.parts),
    part1Topics: repairTopicGroups(
      c,
      'part1Topics',
      'part1Questions',
      'General questions',
    ),
    part3Topics: repairTopicGroups(
      c,
      'part3Topics',
      'part3Questions',
      'General discussion',
    ),
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
          if (
            !Array.isArray(group.steps) &&
            !Array.isArray(group.nodes)
          ) {
            errors.push(
              `${where} is missing a valid "steps" or "nodes" array`,
            );
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
