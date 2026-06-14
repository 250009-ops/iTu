import type { Metadata } from "next";
import { GradingView } from "@/components/teacher/grading/grading-view";

export const metadata: Metadata = { title: "Writing Grading Queue" };

export default function TeacherGradingPage() {
  return <GradingView />;
}
