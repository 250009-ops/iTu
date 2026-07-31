import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Platform-wide AI kill switch.
 *
 * - Default: disabled (safe for production).
 * - Re-enable: set AI_FEATURES_ENABLED=true (and configure OPENAI_API_KEY).
 */
export function areAiFeaturesEnabled(): boolean {
  const raw = process.env.AI_FEATURES_ENABLED?.trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return false;
}

export function assertAiFeaturesEnabled(feature = 'AI features'): void {
  if (!areAiFeaturesEnabled()) {
    throw new ServiceUnavailableException(
      `${feature} are temporarily disabled on this platform`,
    );
  }
}
