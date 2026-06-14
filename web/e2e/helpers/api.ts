const BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";

export type AuthSession = {
  accessToken: string;
  dashboardPath: string;
  user: { name: string; role: string };
};

export async function apiLogin(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login ${email} failed: ${res.status}`);
  }
  return res.json() as Promise<AuthSession>;
}

export async function api<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Complete L/R/W/S after UI check-in (hybrid — listening may already be active). */
export async function completeExamSections(sessionCode: string, token: string) {
  const session = await api<{ state: string }>(
    "GET",
    `/exam-sessions/${sessionCode}`,
    token,
  );

  const state = session.state.toLowerCase();

  if (!state.includes("listening")) {
    await api("POST", `/exam-sessions/${sessionCode}/start-section`, token, {
      skill: "LISTENING",
    });
  }

  if (!state.includes("listening_submitted") && !state.includes("reading")) {
    await api("POST", `/exam-sessions/${sessionCode}/answers`, token, {
      answers: { 1: "A", 2: "B", 3: "C" },
    });
    await api("POST", `/exam-sessions/${sessionCode}/submit-section`, token, {
      skill: "LISTENING",
    });
  }

  if (!state.includes("reading_submitted") && !state.includes("writing")) {
    await api("POST", `/exam-sessions/${sessionCode}/start-section`, token, {
      skill: "READING",
    });
    await api("POST", `/exam-sessions/${sessionCode}/answers`, token, {
      answers: { 1: "TRUE", 2: "FALSE" },
    });
    await api("POST", `/exam-sessions/${sessionCode}/submit-section`, token, {
      skill: "READING",
    });
  }

  if (!state.includes("writing_submitted") && !state.includes("speaking")) {
    await api("POST", `/exam-sessions/${sessionCode}/start-section`, token, {
      skill: "WRITING",
    });
    await api("POST", `/exam-sessions/${sessionCode}/submit-writing`, token, {
      task1Text: "Playwright E2E task 1 response with enough words for validation.",
      task2Text:
        "Playwright E2E task 2 response with enough words for the writing section submission test.",
    });
    await api("POST", `/exam-sessions/${sessionCode}/submit-section`, token, {
      skill: "WRITING",
    });
  }

  // Speaking is graded live in the teacher portal UI — do not auto-submit here.
}

export async function gradeWritingForStudent(
  teacherToken: string,
  studentName = "Alex",
) {
  const queue = await api<{ id: string; studentName: string }[]>(
    "GET",
    "/grading/writing-queue",
    teacherToken,
  );
  const row = queue.find((w) =>
    w.studentName.toLowerCase().includes(studentName.toLowerCase()),
  );
  if (!row) {
    throw new Error(`No writing submission for ${studentName}`);
  }
  await api("POST", `/grading/writing/${row.id}/score`, teacherToken, {
    criteriaScores: {
      taskAchievement: 7,
      coherence: 7,
      lexical: 7,
      grammar: 7,
    },
    overallBand: 7,
    feedback: "Playwright E2E writing grade.",
  });
  return row.id;
}

export async function gradeSpeakingForStudent(
  teacherToken: string,
  studentName = "Alex",
) {
  const dash = await api<{
    speakingSchedule: { id: string; studentName: string }[];
  }>("GET", "/teachers/dashboard", teacherToken);
  const session = dash.speakingSchedule.find((s) =>
    s.studentName.toLowerCase().includes(studentName.toLowerCase()),
  );
  if (!session) {
    throw new Error(`No speaking session for ${studentName}`);
  }
  await api("POST", `/grading/speaking/${session.id}/score`, teacherToken, {
    criteriaScores: {
      fluency: 7,
      lexical: 7,
      grammar: 7,
      pronunciation: 7,
    },
    overallBand: 7,
    feedback: "Playwright E2E speaking grade.",
    teacherNotes: "E2E test",
  });
  return session.id;
}
