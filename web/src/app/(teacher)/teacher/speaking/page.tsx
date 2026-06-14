import type { Metadata } from "next";
import { SpeakingConsoleView } from "@/components/teacher/speaking/speaking-console-view";

export const metadata: Metadata = { title: "Speaking Examiner Console" };

export default function TeacherSpeakingPage() {
  return <SpeakingConsoleView />;
}
