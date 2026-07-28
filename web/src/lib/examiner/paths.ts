const INST_EXAMINER = "/inst-examiner";
const TEACHER = "/teacher";

export type ExaminerPortal = typeof INST_EXAMINER | typeof TEACHER;

export function examinerPortalFromPathname(
  pathname?: string | null,
): ExaminerPortal {
  if (pathname?.startsWith(INST_EXAMINER)) return INST_EXAMINER;
  return TEACHER;
}

export function examinerWritingGradingHubPath(portal: ExaminerPortal): string {
  return portal === INST_EXAMINER
    ? `${INST_EXAMINER}/grading`
    : `${TEACHER}/grading`;
}

export function examinerWritingGradingDetailPath(
  portal: ExaminerPortal,
  submissionId: string,
): string {
  return `${examinerWritingGradingHubPath(portal)}/${submissionId}`;
}

export function examinerSpeakingPath(
  portal: ExaminerPortal,
  sessionId?: string,
  options?: { live?: boolean },
): string {
  const base =
    portal === INST_EXAMINER
      ? `${INST_EXAMINER}/speaking`
      : `${TEACHER}/speaking`;
  if (!sessionId) return base;
  const params = new URLSearchParams({ session: sessionId });
  if (options?.live) params.set("live", "1");
  return `${base}?${params.toString()}`;
}

/** Rewrite legacy marketplace notification links for centre examiners. */
export function resolveExaminerNotificationHref(
  href: string,
  pathname?: string | null,
): string {
  if (examinerPortalFromPathname(pathname) !== INST_EXAMINER) return href;

  if (href.startsWith("/teacher/grading")) {
    return href.replace("/teacher/grading", `${INST_EXAMINER}/grading`);
  }
  if (href.startsWith("/teacher/speaking")) {
    return href.replace("/teacher/speaking", `${INST_EXAMINER}/speaking`);
  }
  if (href === "/teacher/writing") {
    return `${INST_EXAMINER}/grading`;
  }
  if (href === "/teacher" || href === "/teacher/dashboard") {
    return INST_EXAMINER;
  }
  if (href.startsWith("/teacher/")) {
    return INST_EXAMINER;
  }
  return href;
}
