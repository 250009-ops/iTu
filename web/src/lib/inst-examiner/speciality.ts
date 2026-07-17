export type ExaminerSpeciality = "writing" | "speaking" | "both";

export function normalizeExaminerSpeciality(
  raw?: string | null,
): ExaminerSpeciality {
  const s = raw?.toLowerCase();
  if (s === "writing" || s === "speaking" || s === "both") return s;
  return "both";
}

export function canAccessSpeaking(speciality: ExaminerSpeciality): boolean {
  return speciality === "speaking" || speciality === "both";
}

export function canAccessWriting(speciality: ExaminerSpeciality): boolean {
  return speciality === "writing" || speciality === "both";
}

export function examinerSpecialityLabel(speciality: ExaminerSpeciality): string {
  if (speciality === "writing") return "Writing";
  if (speciality === "speaking") return "Speaking";
  return "Writing & Speaking";
}
