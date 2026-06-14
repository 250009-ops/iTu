import type { Metadata } from "next";
import { WritingGradingView } from "@/components/teacher/grading/writing-grading-view";

export const metadata: Metadata = { title: "Grade Writing Submission" };

export default async function TeacherWritingGradingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WritingGradingView submissionId={id} />;
}
