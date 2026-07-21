import { Prisma } from '@prisma/client';

/** Detect Prisma unique-constraint violations (P2002). */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Parse trailing digits after a fixed prefix, e.g. PRA-REA-P001 → 1. */
export function parseNumericSuffix(
  code: string,
  prefix: string,
): number | null {
  const normalized = code.trim().toUpperCase();
  const upperPrefix = prefix.toUpperCase();
  if (!normalized.startsWith(upperPrefix)) return null;
  const suffix = normalized.slice(upperPrefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  return Number.parseInt(suffix, 10);
}

/** Next code in a PREFIX### sequence using numeric max (not lexicographic sort). */
export function nextSequentialCode(
  codes: ReadonlyArray<string>,
  prefix: string,
  padWidth = 3,
): string {
  let max = 0;
  for (const code of codes) {
    const serial = parseNumericSuffix(code, prefix);
    if (serial != null) max = Math.max(max, serial);
  }
  return `${prefix}${String(max + 1).padStart(padWidth, '0')}`;
}

/** Allocate a random PREFIX-#### code, checking existence before returning. */
export async function generateUniquePrefixedCode(
  exists: (code: string) => Promise<boolean>,
  options: {
    prefix: string;
    separator?: string;
    randomDigits?: number;
    maxAttempts?: number;
  },
): Promise<string> {
  const separator = options.separator ?? '-';
  const digits = options.randomDigits ?? 4;
  const maxAttempts = options.maxAttempts ?? 12;
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const num = Math.floor(min + Math.random() * (max - min + 1));
    const code = `${options.prefix}${separator}${num}`;
    if (!(await exists(code))) return code;
  }

  throw new Error(
    `Could not allocate a unique code for prefix ${options.prefix}`,
  );
}

/** Retry an insert when a concurrent request wins the same unique key. */
export async function withUniqueRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isUniqueConstraintError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

type MockNumberFilter = {
  scopeKey: string;
  packageKind: string;
  institutionId?: string | null;
};

type MockPackageReader = {
  mockTestPackage: {
    findFirst: (args: object) => Promise<{ mockNumber: number } | null>;
  };
};

/** Next mockNumber for a scoped package kind (platform or institution). */
export async function queryNextMockNumber(
  prisma: MockPackageReader,
  filter: MockNumberFilter,
): Promise<number> {
  const latest = await prisma.mockTestPackage.findFirst({
    where: {
      scopeKey: filter.scopeKey,
      packageKind: filter.packageKind,
      institutionId: filter.institutionId ?? null,
    },
    orderBy: { mockNumber: 'desc' },
    select: { mockNumber: true },
  });
  return (latest?.mockNumber ?? 0) + 1;
}
