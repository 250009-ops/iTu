import type { Metadata } from "next";
import { InstExaminerSpeakingView } from "@/components/inst-examiner/speaking-sessions-view";
import { InstExaminerSpecialityGuard } from "@/components/inst-examiner/speciality-guard";

export const metadata: Metadata = { title: "Speaking Sessions | Centre Examiner" };

export default function InstExaminerSpeakingPage() {
  return (
    <InstExaminerSpecialityGuard area="speaking">
      <InstExaminerSpeakingView />
    </InstExaminerSpecialityGuard>
  );
}
