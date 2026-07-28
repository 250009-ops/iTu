import type { Metadata } from "next";
import { InstExaminerSpecialityGuard } from "@/components/inst-examiner/speciality-guard";
import { InstExaminerWritingDetailView } from "@/components/inst-examiner/writing-detail-view";

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
      <InstExaminerWritingDetailView submissionId={id} />
    </InstExaminerSpecialityGuard>
  );
}
