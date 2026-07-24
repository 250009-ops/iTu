/**
 * Student-facing Practice product visibility.
 * Admin Practice Studio / packages stay available regardless of these flags.
 *
 * - Hidden in production builds (students cannot access).
 * - Available in local `next dev` so the Reading AI environment can be tested.
 * - Override anytime with NEXT_PUBLIC_PRACTICE_STUDENT_VISIBLE=true|false
 */
const envOverride = process.env.NEXT_PUBLIC_PRACTICE_STUDENT_VISIBLE;
export const PRACTICE_STUDENT_VISIBLE =
  envOverride === "true"
    ? true
    : envOverride === "false"
      ? false
      : process.env.NODE_ENV === "development";

/** Marketing site Practice page, nav links, and practice CTAs — keep off until launch. */
export const PRACTICE_MARKETING_VISIBLE = false;
