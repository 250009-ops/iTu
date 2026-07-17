import type { Metadata } from "next";
import { InstExaminerWritingView } from "@/components/inst-examiner/writing-grading-view";
import { InstExaminerSpecialityGuard } from "@/components/inst-examiner/speciality-guard";

export const metadata: Metadata = { title: "Writing Grading | Centre Examiner" };

export default function InstExaminerGradingPage() {
  return (
    <InstExaminerSpecialityGuard area="writing">
      <InstExaminerWritingView />
    </InstExaminerSpecialityGuard>
  );
}
