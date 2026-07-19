"use client";

import { usePathname } from "next/navigation";
import {
  examinerPortalFromPathname,
  examinerSpeakingPath,
  examinerWritingGradingDetailPath,
  examinerWritingGradingHubPath,
  type ExaminerPortal,
} from "@/lib/examiner/paths";

export function useExaminerPaths() {
  const pathname = usePathname();
  const portal = examinerPortalFromPathname(pathname);

  return {
    portal,
    gradingHub: examinerWritingGradingHubPath(portal),
    gradingDetail: (submissionId: string) =>
      examinerWritingGradingDetailPath(portal, submissionId),
    speaking: (sessionId?: string, options?: { live?: boolean }) =>
      examinerSpeakingPath(portal, sessionId, options),
  };
}

export function examinerPathsForPortal(portal: ExaminerPortal) {
  return {
    portal,
    gradingHub: examinerWritingGradingHubPath(portal),
    gradingDetail: (submissionId: string) =>
      examinerWritingGradingDetailPath(portal, submissionId),
    speaking: (sessionId?: string, options?: { live?: boolean }) =>
      examinerSpeakingPath(portal, sessionId, options),
  };
}
