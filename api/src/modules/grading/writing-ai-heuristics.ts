import type { WritingAnnotationDto } from './writing-ai-evaluation.service';
import { countWords } from './writing-word-count';

const TASK1_CONCLUSION_PATTERNS =
  /\b(in conclusion|to (?:sum up|conclude)|overall,? i (?:think|believe)|in my opinion|i (?:think|believe) that)\b/i;

const TASK2_CONCLUSION_PATTERNS =
  /\b(in conclusion|to (?:sum up|conclude)|in summary|all in all|on balance)\b/i;

const TASK1_OPINION_PATTERNS =
  /\b(i (?:think|believe|feel)|in my opinion|personally,? i)\b/i;

/** Find repeated 3–5 word phrases (2+ occurrences). */
export function findRepeatedPhrases(
  text: string,
  minWords = 3,
  maxWords = 5,
): Array<{ phrase: string; count: number; start: number }> {
  const normalized = text.trim();
  if (!normalized) return [];

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const candidates = new Set<string>();

  for (let len = minWords; len <= maxWords; len++) {
    for (let i = 0; i <= tokens.length - len; i++) {
      candidates.add(tokens.slice(i, i + len).join(' '));
    }
  }

  const results: Array<{ phrase: string; count: number; start: number }> = [];

  for (const phrase of candidates) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = normalized.match(regex);
    if (!matches || matches.length < 2) continue;
    const start = normalized.toLowerCase().indexOf(phrase.toLowerCase());
    if (start >= 0) {
      results.push({ phrase, count: matches.length, start });
    }
  }

  return results.sort((a, b) => b.count - a.count).slice(0, 5);
}

export function enrichTask1Annotations(
  essayText: string,
  annotations: WritingAnnotationDto[],
  usedRanges: Array<{ start: number; end: number }>,
): WritingAnnotationDto[] {
  const result = [...annotations];
  const wordCount = countWords(essayText);

  if (TASK1_CONCLUSION_PATTERNS.test(essayText)) {
    const match = essayText.match(TASK1_CONCLUSION_PATTERNS);
    if (match?.index != null) {
      pushUniqueAnnotation(result, usedRanges, essayText, {
        text: match[0],
        criterion: 'ta',
        title: 'Opinion or conclusion in Task 1',
        explanation:
          'Academic Task 1 is a factual report. Personal opinions and essay-style conclusions are not appropriate and reduce Task Achievement.',
        suggestion:
          'Remove opinion/conclusion language. End with a factual summary of the main trends or comparisons only.',
      });
    }
  }

  if (TASK1_OPINION_PATTERNS.test(essayText)) {
    const match = essayText.match(TASK1_OPINION_PATTERNS);
    if (match?.index != null && !TASK1_CONCLUSION_PATTERNS.test(match[0])) {
      pushUniqueAnnotation(result, usedRanges, essayText, {
        text: match[0],
        criterion: 'ta',
        title: 'Personal opinion in Task 1 report',
        explanation:
          'Task 1 requires objective description of data — not personal views.',
        suggestion:
          'Rewrite using neutral reporting language (e.g. "The figure rose…" instead of "I think…").',
      });
    }
  }

  if (wordCount >= 150 && wordCount < 180 && !hasCriterion(result, 'ta')) {
    result.unshift({
      start: 0,
      end: Math.min(essayText.length, 1),
      criterion: 'ta',
      title: 'Minimal Task 1 report length',
      explanation: `At ${wordCount} words the report meets the minimum but offers limited overview/detail. Band 7+ typically needs clearer overview and fuller comparison.`,
      suggestion:
        'Add a concise overview sentence and one more comparative detail (e.g. highest/lowest, overall trend).',
    });
  }

  addRepetitionAnnotations(essayText, result, usedRanges);
  return result;
}

export function enrichTask2Annotations(
  essayText: string,
  annotations: WritingAnnotationDto[],
  usedRanges: Array<{ start: number; end: number }>,
): WritingAnnotationDto[] {
  const result = [...annotations];
  const paragraphs = essayText.split(/\n\s*\n/).filter((p) => p.trim());
  const lastParagraph = paragraphs[paragraphs.length - 1] ?? essayText.slice(-400);

  if (
    countWords(essayText) >= 200 &&
    !TASK2_CONCLUSION_PATTERNS.test(lastParagraph)
  ) {
    const start = Math.max(0, essayText.length - lastParagraph.length);
    result.unshift({
      start,
      end: Math.min(essayText.length, start + 1),
      criterion: 'ta',
      title: 'Missing or weak conclusion',
      explanation:
        'Task 2 essays should end with a clear conclusion that restates the position and summarises key ideas.',
      suggestion:
        'Add a final paragraph beginning with "In conclusion," that paraphrases your thesis and main points — do not introduce new arguments.',
    });
  }

  if (paragraphs.length < 3 && countWords(essayText) >= 200) {
    result.unshift({
      start: 0,
      end: Math.min(essayText.length, 1),
      criterion: 'cc',
      title: 'Under-developed essay structure',
      explanation:
        'A Task 2 essay typically needs an introduction, at least two body paragraphs, and a conclusion for Coherence & Cohesion at Band 6+.',
      suggestion:
        'Split ideas into separate body paragraphs with clear topic sentences and one main idea per paragraph.',
    });
  }

  addRepetitionAnnotations(essayText, result, usedRanges);
  return result;
}

function addRepetitionAnnotations(
  essayText: string,
  annotations: WritingAnnotationDto[],
  usedRanges: Array<{ start: number; end: number }>,
): void {
  for (const { phrase, count } of findRepeatedPhrases(essayText)) {
    if (annotations.some((a) => a.title.toLowerCase().includes('repetit'))) {
      continue;
    }
    pushUniqueAnnotation(annotations, usedRanges, essayText, {
      text: phrase,
      criterion: 'lr',
      title: 'Repetitive vocabulary',
      explanation: `The phrase "${phrase}" appears ${count} times, which limits lexical range.`,
      suggestion: `Replace repeated uses of "${phrase}" with varied expressions (e.g. synonyms or rephrased structures).`,
    });
    break;
  }
}

function hasCriterion(
  annotations: WritingAnnotationDto[],
  criterion: WritingAnnotationDto['criterion'],
): boolean {
  return annotations.some((a) => a.criterion === criterion);
}

function pushUniqueAnnotation(
  annotations: WritingAnnotationDto[],
  usedRanges: Array<{ start: number; end: number }>,
  essayText: string,
  raw: {
    text: string;
    criterion: WritingAnnotationDto['criterion'];
    title: string;
    explanation: string;
    suggestion?: string;
  },
): void {
  const span = findUnusedSpan(essayText, raw.text, usedRanges);
  if (!span) return;
  usedRanges.push(span);
  annotations.push({
    start: span.start,
    end: span.end,
    criterion: raw.criterion,
    title: raw.title,
    explanation: raw.explanation,
    suggestion: raw.suggestion,
  });
}

function findUnusedSpan(
  text: string,
  snippet: string,
  usedRanges: Array<{ start: number; end: number }>,
): { start: number; end: number } | null {
  if (!snippet?.trim()) return null;
  let searchFrom = 0;
  while (searchFrom < text.length) {
    let idx = text.indexOf(snippet, searchFrom);
    if (idx < 0) {
      idx = text.toLowerCase().indexOf(snippet.toLowerCase(), searchFrom);
    }
    if (idx < 0) return null;
    const span = { start: idx, end: idx + snippet.length };
    if (!rangesOverlap(span, usedRanges)) return span;
    searchFrom = idx + 1;
  }
  return null;
}

function rangesOverlap(
  span: { start: number; end: number },
  used: Array<{ start: number; end: number }>,
): boolean {
  return used.some((u) => span.start < u.end && span.end > u.start);
}

export function capSimpleTask1Scores(
  scores: Record<string, number>,
  essayText: string,
): Record<string, number> {
  const words = countWords(essayText);
  if (words < 150 || words > 220) return scores;

  const sentences = essayText.split(/[.!?]+/).filter((s) => s.trim()).length;
  if (sentences <= 4 && typeof scores.taskAchievement === 'number') {
    return {
      ...scores,
      taskAchievement: Math.min(scores.taskAchievement, 6.5),
    };
  }
  return scores;
}
