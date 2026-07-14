import type { Metadata } from "next";
import { InstExaminerWritingView } from "@/components/inst-examiner/writing-grading-view";

export const metadata: Metadata = { title: "Writing Grading | Centre Examiner" };

export default function InstExaminerGradingPage() {
  return <InstExaminerWritingView />;
}
