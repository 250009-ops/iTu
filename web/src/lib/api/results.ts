import { getAccessToken } from "@/lib/auth/session";
import { API_BASE_URL } from "./config";
import { apiFetch } from "./client";
import { ApiError } from "./errors";

export function listResults() {
  return apiFetch<
    {
      enrollmentCode: string;
      mockDate: string;
      package: string;
      overallBand: number | null;
      pdfUrl?: string | null;
    }[]
  >("/results");
}

export function getPendingResult() {
  return apiFetch<{
    enrollmentCode: string;
    mockDate: string;
    package: string;
    resultsStatus: string;
    message: string;
  } | null>("/results/pending");
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
    pdfUrl?: string | null;
    skills?: {
      skill: string;
      band: number | null;
      rawScore: number | null;
      feedback?: string | null;
      criteriaScores?: Record<string, number>;
    }[];
  }>(`/results/${enrollmentId}`);
}

export async function downloadResultPdf(
  enrollmentCode: string,
  filename?: string,
) {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/results/${encodeURIComponent(enrollmentCode)}/pdf`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
  } catch {
    throw new ApiError(
      `Cannot reach API at ${API_BASE_URL}. Start the backend: cd api && npm run start:dev`,
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `Could not download PDF (${response.status})`,
      response.status,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `itestu-report-${enrollmentCode}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
