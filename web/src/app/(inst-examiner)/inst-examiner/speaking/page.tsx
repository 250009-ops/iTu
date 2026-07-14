import type { Metadata } from "next";
import { InstExaminerSpeakingView } from "@/components/inst-examiner/speaking-sessions-view";

export const metadata: Metadata = { title: "Speaking Sessions | Centre Examiner" };

export default function InstExaminerSpeakingPage() {
  return <InstExaminerSpeakingView />;
}
