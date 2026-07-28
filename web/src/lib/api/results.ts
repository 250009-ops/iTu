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
      resultsStatus?: string;
    }[]
  >("/results");
}

export function getPendingResult() {
  return apiFetch<{
    enrollmentCode: string;
    mockDate: string;
    package: string;
    packageSkills?: string[];
    resultsStatus: string;
    message: string;
  } | null>("/results/pending");
}

export function getResult(enrollmentId: string) {
  return apiFetch<{
    released: boolean;
    partial?: boolean;
    status?: string;
    message?: string;
    enrollmentCode?: string;
    mockDate?: string;
    package?: string;
    packageSkills?: string[];
    overallBand?: number | null;
    pdfUrl?: string | null;
    candidateName?: string | null;
    candidateEmail?: string | null;
    country?: string | null;
    candidateExamType?: string | null;
    /** ISO date strings — formatted on the certificate as DD/MMM/YYYY. */
    issueDate?: string | null;
    dateOfBirth?: string | null;
    sex?: string | null;
    firstLanguage?: string | null;
    schemeCode?: string | null;
    centre?: {
      name: string;
      logoUrl: string | null;
      city: string | null;
      code?: string | null;
    } | null;
    skills?: {
      skill: string;
      band: number | null;
      rawScore: number | null;
      feedback?: string | null;
      criteriaScores?: Record<string, unknown>;
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
