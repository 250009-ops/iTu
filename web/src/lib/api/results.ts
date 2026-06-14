import { apiFetch } from "./client";

export function listResults() {
  return apiFetch<
    {
      enrollmentCode: string;
      mockDate: string;
      package: string;
      overallBand: number | null;
    }[]
  >("/results");
}

export function getResult(enrollmentId: string) {
  return apiFetch<{
    released: boolean;
    status?: string;
    message?: string;
    enrollmentCode?: string;
    mockDate?: string;
    package?: string;
    overallBand?: number | null;
    skills?: {
      skill: string;
      band: number | null;
      rawScore: number | null;
      feedback?: string | null;
      criteriaScores?: Record<string, number>;
    }[];
  }>(`/results/${enrollmentId}`);
}
