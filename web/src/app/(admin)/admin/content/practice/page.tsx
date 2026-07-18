import type { Metadata } from "next";
import { PracticeStudioView } from "@/components/admin/content/practice/practice-studio-view";

export const metadata: Metadata = { title: "Practice Creation" };

export default function AdminContentPracticePage() {
  return <PracticeStudioView />;
}
