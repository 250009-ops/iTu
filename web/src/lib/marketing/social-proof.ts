/** Minimum count before showing social-proof numbers on public marketing. */
export const SOCIAL_PROOF_MIN = 50;

/** Returns a floored marketing count (e.g. 127 → "100+") or null when below threshold. */
export function formatSocialCount(n: number): string | null {
  if (n < SOCIAL_PROOF_MIN) return null;
  const floored = Math.floor(n / SOCIAL_PROOF_MIN) * SOCIAL_PROOF_MIN;
  return `${floored.toLocaleString()}+`;
}

export function examinerHeadlineCopy(examiners: string | null): string {
  if (examiners) {
    return `Join ${examiners} examiners earning from flexible, fully remote grading and live Speaking sessions.`;
  }
  return "Be among our first certified examiners — flexible remote grading and live Speaking sessions.";
}

export function examinerCtaCopy(examiners: string | null): string {
  if (examiners) {
    return `Join ${examiners} certified examiners already on the platform. The application takes 10 minutes.`;
  }
  return "Apply to become an examiner — the application takes about 10 minutes.";
}

export function candidatesCtaCopy(candidates: string | null): string {
  if (candidates) {
    return `Join ${candidates} candidates who took the test that prepares you for the test.`;
  }
  return "Take the mock that prepares you for the real test.";
}
