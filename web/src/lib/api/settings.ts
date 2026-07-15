import { apiFetch } from "@/lib/api/client";
import type { BandTiers } from "@/lib/examiner-rate-tiers";

export function getExaminerRateTiers() {
  return apiFetch<BandTiers>("/settings/examiner-rate-tiers", { auth: false });
}
