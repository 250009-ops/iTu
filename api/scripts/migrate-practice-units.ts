/**
 * One-time migration: align legacy practice units with per-part / per-format codes,
 * canonical titles, single-passage content, and refreshed question counts.
 *
 * Usage (from api/):
 *   npx tsx scripts/migrate-practice-units.ts           # dry-run (default)
 *   npx tsx scripts/migrate-practice-units.ts --apply   # write changes
 */
import { ExamSkill, PracticeUnitType, PrismaClient } from '@prisma/client';
import { nextSequentialCode } from '../src/common/id-allocation';
import {
  countQuestionsInContent,
  passagePartFromPracticeContent,
  prefixForUnitType,
  skillForUnitType,
  wrapListeningPartContent,
  wrapReadingPassageContent,
} from '../src/modules/practice-content/practice-content.utils';

const prisma = new PrismaClient();

const QUESTION_TYPE_LABELS: Record<string, string> = {
  note_completion: 'Note completion',
  form_completion: 'Form completion',
  summary_completion: 'Summary completion',
  summary_completion_list: 'Summary completion (from list)',
  sentence_completion: 'Sentence completion',
  table_completion: 'Table completion',
  mcq_single: 'Multiple choice (single)',
  mcq_multi: 'Multiple choice (choose multiple)',
  matching: 'Matching',
  matching_headings: 'Matching headings',
  matching_information: 'Matching information',
  tfng: 'True / False / Not Given',
  yng: 'Yes / No / Not Given',
  map_labeling: 'Map labeling',
  short_answer: 'Short answer',
  flowchart_completion: 'Flow-chart completion',
  instruction_screen: 'Instruction screen',
  matching_features: 'Matching features',
};

type UnitRow = {
  id: string;
  code: string;
  title: string;
  type: PracticeUnitType;
  skill: ExamSkill;
  questionType: string | null;
  content: unknown;
  questionCount: number;
  status: string;
  createdAt: Date;
};

type BucketOptions = {
  passagePart?: number;
  listeningPart?: number;
  questionType?: string;
};

type MigrationPlan = {
  id: string;
  oldCode: string;
  newCode: string;
  oldTitle: string;
  newTitle: string;
  content: object;
  questionCount: number;
  status: string;
  changes: string[];
};

function escapeRegex(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function bucketKey(type: PracticeUnitType, options: BucketOptions): string {
  if (type === 'READING_PASSAGE') {
    return `${type}|p${options.passagePart ?? 1}`;
  }
  if (type === 'LISTENING_SECTION') {
    return `${type}|s${options.listeningPart ?? 1}`;
  }
  if (type === 'READING_QUESTION_TYPE' || type === 'LISTENING_QUESTION_TYPE') {
    return `${type}|q${options.questionType ?? 'unknown'}`;
  }
  return type;
}

function bucketOptionsForUnit(unit: UnitRow): BucketOptions {
  if (unit.type === 'READING_PASSAGE') {
    return { passagePart: resolveReadingPassagePart(unit) };
  }
  if (unit.type === 'LISTENING_SECTION') {
    return { listeningPart: resolveListeningSectionPart(unit) };
  }
  const questionType = resolveQuestionType(unit);
  return { questionType: questionType ?? undefined };
}

function resolveReadingPassagePart(unit: UnitRow): 1 | 2 | 3 {
  const fromCode = unit.code.match(/^PRA-REA-P([123])-/i)?.[1];
  if (fromCode) return Number(fromCode) as 1 | 2 | 3;
  const fromContent = passagePartFromPracticeContent(unit.type, unit.content);
  if (fromContent != null && fromContent >= 1 && fromContent <= 3) {
    return fromContent as 1 | 2 | 3;
  }
  return 1;
}

function resolveListeningSectionPart(unit: UnitRow): 1 | 2 | 3 | 4 {
  const fromCode = unit.code.match(/^PRA-LIS-S([1-4])-/i)?.[1];
  if (fromCode) return Number(fromCode) as 1 | 2 | 3 | 4;
  const fromContent = passagePartFromPracticeContent(unit.type, unit.content);
  if (fromContent != null && fromContent >= 1 && fromContent <= 4) {
    return fromContent as 1 | 2 | 3 | 4;
  }
  return 1;
}

function resolveQuestionType(unit: UnitRow): string | null {
  if (unit.questionType?.trim()) return unit.questionType.trim();
  if (!unit.content || typeof unit.content !== 'object') return null;
  const c = unit.content as Record<string, unknown>;
  const passages = c.passages;
  const parts = c.parts;
  const groups =
    (Array.isArray(passages) &&
      passages[0] &&
      typeof passages[0] === 'object' &&
      (passages[0] as { groups?: unknown[] }).groups) ||
    (Array.isArray(parts) &&
      parts[0] &&
      typeof parts[0] === 'object' &&
      (parts[0] as { groups?: unknown[] }).groups);
  if (Array.isArray(groups) && groups[0] && typeof groups[0] === 'object') {
    const type = (groups[0] as { type?: string }).type;
    return typeof type === 'string' ? type : null;
  }
  return null;
}

function codeMatchesBucket(
  type: PracticeUnitType,
  code: string,
  options: BucketOptions,
): boolean {
  const prefix = prefixForUnitType(type, options);
  const pattern = new RegExp(`^${escapeRegex(prefix)}\\d{3,}$`, 'i');
  return pattern.test(code.trim());
}

function expectedTitle(
  type: PracticeUnitType,
  options: BucketOptions,
): string {
  if (type === 'READING_PASSAGE') {
    return `Reading Passage ${options.passagePart ?? 1} practice`;
  }
  if (type === 'LISTENING_SECTION') {
    return `Listening Section ${options.listeningPart ?? 1} practice`;
  }
  const qt = options.questionType;
  if (qt) {
    const label = QUESTION_TYPE_LABELS[qt] ?? qt.replace(/_/g, ' ');
    return `${label} drill`;
  }
  return 'Question-type drill';
}

function shouldUpdateTitle(
  current: string,
  expected: string,
  codeChanging: boolean,
): boolean {
  if (current.trim() === expected) return false;
  if (codeChanging) return true;
  const normalized = current.trim().toLowerCase();
  if (normalized === 'new reading passage practice') return true;
  if (normalized === 'new listening section practice') return true;
  if (/^reading passage \d practice$/.test(normalized)) return true;
  if (/^listening section \d practice$/.test(normalized)) return true;
  if (normalized.endsWith(' drill')) {
    return normalized !== expected.trim().toLowerCase();
  }
  return false;
}

function normalizeContent(
  unit: UnitRow,
  options: BucketOptions,
): object {
  const content = unit.content;
  if (!content || typeof content !== 'object') return {};

  const c = { ...(content as Record<string, unknown>) };

  if (unit.type === 'READING_PASSAGE') {
    const part = options.passagePart ?? 1;
    if (Array.isArray(c.passages) && c.passages.length > 0) {
      const first =
        c.passages[0] && typeof c.passages[0] === 'object'
          ? { ...(c.passages[0] as object) }
          : {};
      const passage = {
        ...first,
        part,
        id:
          typeof (first as { id?: string }).id === 'string'
            ? (first as { id: string }).id
            : `passage-${part}`,
      };
      return { ...c, passages: [passage] };
    }
    if (c.id && c.groups) {
      return wrapReadingPassageContent({ ...(content as object), part });
    }
    return wrapReadingPassageContent({
      id: `passage-${part}`,
      part,
      title: '',
      body: '',
      groups: [],
    });
  }

  if (unit.type === 'READING_QUESTION_TYPE') {
    if (Array.isArray(c.passages) && c.passages[0] && typeof c.passages[0] === 'object') {
      const first = { ...(c.passages[0] as object), part: 1 };
      return { ...c, passages: [first] };
    }
    return content as object;
  }

  if (unit.type === 'LISTENING_SECTION') {
    const part = options.listeningPart ?? 1;
    if (Array.isArray(c.parts) && c.parts.length > 0) {
      const first =
        c.parts[0] && typeof c.parts[0] === 'object'
          ? { ...(c.parts[0] as object) }
          : {};
      const listeningPart = {
        ...first,
        part,
        id:
          typeof (first as { id?: string }).id === 'string'
            ? (first as { id: string }).id
            : `part-${part}`,
      };
      return {
        ...c,
        parts: [listeningPart],
        audioTracks: Array.isArray(c.audioTracks) ? c.audioTracks : [],
      };
    }
    if (c.id && c.groups) {
      return wrapListeningPartContent({ ...(content as object), part });
    }
    return wrapListeningPartContent({
      id: `part-${part}`,
      part,
      title: '',
      groups: [],
    });
  }

  if (unit.type === 'LISTENING_QUESTION_TYPE') {
    if (Array.isArray(c.parts) && c.parts[0] && typeof c.parts[0] === 'object') {
      const first = { ...(c.parts[0] as object), part: 1 };
      return {
        ...c,
        parts: [first],
        audioTracks: Array.isArray(c.audioTracks) ? c.audioTracks : [],
      };
    }
    return content as object;
  }

  return content as object;
}

function contentChanged(before: unknown, after: object): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function buildPlans(units: UnitRow[]): MigrationPlan[] {
  const byBucket = new Map<string, UnitRow[]>();

  for (const unit of units) {
    const options = bucketOptionsForUnit(unit);
    const key = bucketKey(unit.type, options);
    const list = byBucket.get(key) ?? [];
    list.push(unit);
    byBucket.set(key, list);
  }

  const plans: MigrationPlan[] = [];

  for (const bucketUnits of Array.from(byBucket.values())) {
    bucketUnits.sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );

    const sample = bucketUnits[0]!;
    const options = bucketOptionsForUnit(sample);
    const assignedCodes: string[] = [];

    for (const unit of bucketUnits) {
      if (codeMatchesBucket(unit.type, unit.code, options)) {
        assignedCodes.push(unit.code.trim().toUpperCase());
      }
    }

    for (const unit of bucketUnits) {
      const unitOptions = bucketOptionsForUnit(unit);
      const normalized = normalizeContent(unit, unitOptions);
      const skill = skillForUnitType(unit.type);
      const questionCount = countQuestionsInContent(skill, normalized);
      const title = expectedTitle(unit.type, unitOptions);
      const codeChanging = !codeMatchesBucket(unit.type, unit.code, unitOptions);
      const newCode = codeChanging
        ? nextSequentialCode(assignedCodes, prefixForUnitType(unit.type, unitOptions))
        : unit.code.trim().toUpperCase();

      if (codeChanging) {
        assignedCodes.push(newCode);
      }

      const titleChanging = shouldUpdateTitle(unit.title, title, codeChanging);
      const countChanging = unit.questionCount !== questionCount;
      const contentChanging = contentChanged(unit.content, normalized);

      const changes: string[] = [];
      if (codeChanging) changes.push(`code ${unit.code} → ${newCode}`);
      if (titleChanging) changes.push(`title "${unit.title}" → "${title}"`);
      if (contentChanging) changes.push('content normalized');
      if (countChanging) {
        changes.push(`questionCount ${unit.questionCount} → ${questionCount}`);
      }

      if (changes.length === 0) continue;

      plans.push({
        id: unit.id,
        oldCode: unit.code,
        newCode,
        oldTitle: unit.title,
        newTitle: titleChanging ? title : unit.title,
        content: normalized,
        questionCount,
        status: unit.status,
        changes,
      });
    }
  }

  return plans.sort(
    (a, b) =>
      a.oldCode.localeCompare(b.oldCode) || a.id.localeCompare(b.id),
  );
}

async function applyPlans(plans: MigrationPlan[]) {
  const codeChanges = plans.filter((plan) => plan.oldCode !== plan.newCode);

  await prisma.$transaction(async (tx) => {
    for (const plan of codeChanges) {
      await tx.practiceUnit.update({
        where: { id: plan.id },
        data: { code: `MIGTMP-${plan.id}` },
      });
    }

    for (const plan of plans) {
      await tx.practiceUnit.update({
        where: { id: plan.id },
        data: {
          code: plan.newCode,
          title: plan.newTitle,
          content: plan.content,
          questionCount: plan.questionCount,
        },
      });
    }
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const units = await prisma.practiceUnit.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (units.length === 0) {
    console.log('No practice units found — nothing to migrate.');
    return;
  }

  const plans = buildPlans(units);

  if (plans.length === 0) {
    console.log(
      `All ${units.length} practice unit(s) already use aligned codes, titles, and content.`,
    );
    return;
  }

  console.log(
    `${apply ? 'Applying' : 'Dry-run for'} ${plans.length} of ${units.length} practice unit(s):\n`,
  );

  for (const plan of plans) {
    const published =
      plan.status === 'PUBLISHED' ? ' [published]' : '';
    console.log(`  ${plan.oldCode}${published}`);
    for (const change of plan.changes) {
      console.log(`    - ${change}`);
    }
  }

  if (!apply) {
    console.log('\nNo changes written. Re-run with --apply to migrate.');
    return;
  }

  await applyPlans(plans);
  console.log(`\nMigrated ${plans.length} practice unit(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
