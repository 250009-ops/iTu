/**
 * Platform-wide AI kill switch (marketing + student UX).
 *
 * - Default: disabled (safe for production builds).
 * - Re-enable: NEXT_PUBLIC_AI_FEATURES_ENABLED=true
 * - API must also set AI_FEATURES_ENABLED=true (+ OPENAI_API_KEY).
 *
 * Keep in sync with api/src/common/ai/ai-features.ts
 */
const envOverride = process.env.NEXT_PUBLIC_AI_FEATURES_ENABLED;

export const AI_FEATURES_ENABLED =
  envOverride === "true"
    ? true
    : envOverride === "false"
      ? false
      : false;
