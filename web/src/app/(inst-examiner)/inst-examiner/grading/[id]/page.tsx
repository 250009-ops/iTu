import type { Metadata } from "next";
import { InstExaminerSpecialityGuard } from "@/components/inst-examiner/speciality-guard";
import { WritingGradingView } from "@/components/teacher/grading/writing-grading-view";

export const metadata: Metadata = {
  title: "Grade Writing Submission | Centre Examiner",
};

export default async function InstExaminerWritingGradingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <InstExaminerSpecialityGuard area="writing">
      <WritingGradingView submissionId={id} />
    </InstExaminerSpecialityGuard>
  );
}
