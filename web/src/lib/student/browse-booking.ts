import { STUDENT_VIEW_PATHS } from "@/lib/student/routes";

export type BrowseBookingParams = {
  tab: "writing" | "speaking" | "full-academic";
  writingTeacherId?: string;
  speakingTeacherId?: string;
};

export function buildBrowseBookingUrl(params: BrowseBookingParams): string {
  const search = new URLSearchParams({ tab: params.tab, book: "1" });
  if (params.writingTeacherId) {
    search.set("writingTeacherId", params.writingTeacherId);
  }
  if (params.speakingTeacherId) {
    search.set("speakingTeacherId", params.speakingTeacherId);
  }
  return `${STUDENT_VIEW_PATHS.browse}?${search.toString()}`;
}

export function browseUrlForWritingExaminer(teacherId: string): string {
  return buildBrowseBookingUrl({ tab: "writing", writingTeacherId: teacherId });
}

export function browseUrlForSpeakingExaminer(teacherId: string): string {
  return buildBrowseBookingUrl({ tab: "speaking", speakingTeacherId: teacherId });
}

export function browseUrlForFullMockExaminer(teacherId: string): string {
  return buildBrowseBookingUrl({
    tab: "full-academic",
    writingTeacherId: teacherId,
    speakingTeacherId: teacherId,
  });
}
