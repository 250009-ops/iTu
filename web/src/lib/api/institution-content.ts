import { apiFetch } from "./client";

export function getInstitutionContentTests(type?: string) {
  const q = type ? `?type=${type}` : "";
  return apiFetch<
    {
      id: string;
      code: string;
      title: string;
      type: string;
      status: string;
      version: number;
      durationMin: number;
      updatedAt: string;
      publishedAt: string | null;
      mediaCount?: number;
      questionCount?: number;
    }[]
  >(`/institution/content/tests${q}`);
}

export function getInstitutionContentTest(id: string) {
  return apiFetch<{
    id: string;
    code: string;
    title: string;
    type: string;
    status: string;
    durationMin: number;
    content: unknown;
    answerKey: unknown;
    mediaAssets: {
      id: string;
      key: string;
      url: string;
      mimeType: string;
      sizeBytes: number | null;
    }[];
  }>(`/institution/content/tests/${id}`);
}

export async function uploadInstitutionContentMedia(
  testId: string,
  partKey: string,
  file: File,
) {
  const form = new FormData();
  form.append("file", file);
  const { getAccessToken } = await import("@/lib/auth/session");
  const { API_BASE_URL } = await import("./config");
  const { ApiError } = await import("./errors");
  const token = getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/institution/content/tests/${testId}/media?key=${encodeURIComponent(partKey)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(`Invalid API response (${response.status})`, response.status);
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Upload failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as {
    id: string;
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number | null;
  };
}

export function getNextInstitutionContentTestIdentity(
  module: "listening" | "reading" | "writing" | "speaking",
) {
  return apiFetch<{ code: string; title: string; serial: number }>(
    `/institution/content/tests/next-identity?type=${encodeURIComponent(module.toUpperCase())}`,
  );
}

export function createInstitutionContentTest(payload: {
  code: string;
  title: string;
  type: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  content: object;
  answerKey?: object;
  durationMin?: number;
}) {
  return apiFetch<{
    id: string;
    code: string;
    title: string;
    type: string;
    status: string;
  }>("/institution/content/tests", { method: "POST", body: payload });
}

export function updateInstitutionContentTest(
  id: string,
  payload: {
    title?: string;
    content?: object;
    answerKey?: object;
    durationMin?: number;
  },
) {
  return apiFetch(`/institution/content/tests/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function publishInstitutionContentTest(id: string) {
  return apiFetch(`/institution/content/tests/${id}/publish`, { method: "POST" });
}

export function cloneInstitutionContentTest(id: string) {
  return apiFetch<{ id: string; code: string; title: string }>(
    `/institution/content/tests/${id}/clone`,
    { method: "POST" },
  );
}

export function deleteInstitutionContentTest(id: string) {
  return apiFetch(`/institution/content/tests/${id}`, { method: "DELETE" });
}

export function getInstitutionPackagesMine() {
  return apiFetch<
    {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      packageKind: string;
      packageKindLabel: string;
      mockNumber: number;
      mockLabel: string;
      examType: string;
      skills: unknown;
      isActive: boolean;
      listeningTestId: string | null;
      readingTestId: string | null;
      writingTestId: string | null;
      speakingBankId: string | null;
    }[]
  >("/institution/packages/mine");
}

export function getInstitutionEnrollmentPackages(studentId: string) {
  return apiFetch<{
    studentId: string;
    platform: {
      id: string;
      title: string;
      packageKind: string;
      mockNumber: number;
      skills?: string[];
      needsWriting?: boolean;
      needsSpeaking?: boolean;
    }[];
    own: {
      id: string;
      title: string;
      packageKind: string;
      mockNumber: number;
      costsCredit?: boolean;
      skills?: string[];
      needsWriting?: boolean;
      needsSpeaking?: boolean;
    }[];
  }>(`/institution/enrollment-packages?studentId=${encodeURIComponent(studentId)}`);
}

export function getInstitutionPackageContentTests(type?: string) {
  const q = type ? `/${type.toUpperCase()}` : "";
  return apiFetch<
    {
      id: string;
      code: string;
      title: string;
      type: string;
      status: string;
    }[]
  >(`/institution/packages/content-tests${q}`);
}

export function getInstitutionPackageNextIdentity(params?: {
  packageKind?: string;
  examType?: string;
  skills?: string[];
}) {
  const search = new URLSearchParams();
  if (params?.packageKind) search.set("packageKind", params.packageKind);
  if (params?.examType) search.set("examType", params.examType);
  if (params?.skills?.length) search.set("skills", params.skills.join(","));
  const q = search.toString();
  return apiFetch<{
    title: string;
    mockLabel: string;
    mockNumber: number;
    packageKind: string;
    examType: string;
  }>(`/institution/packages/next-identity${q ? `?${q}` : ""}`);
}

export function createInstitutionPackage(body: {
  title?: string;
  examType?: string;
  skills?: string[];
  description?: string;
}) {
  return apiFetch("/institution/packages", { method: "POST", body });
}

export function updateInstitutionPackageLinks(
  id: string,
  body: {
    listeningTestId?: string | null;
    readingTestId?: string | null;
    writingTestId?: string | null;
    speakingBankId?: string | null;
  },
) {
  return apiFetch(`/institution/packages/${id}`, { method: "PATCH", body });
}

export function activateInstitutionPackage(id: string) {
  return apiFetch(`/institution/packages/${id}/activate`, { method: "POST" });
}
