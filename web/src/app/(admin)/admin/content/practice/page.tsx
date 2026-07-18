import type { Metadata } from "next";
import { AdminContentSectionTabs } from "@/components/admin/admin-section-tabs";
import { PracticeStudioView } from "@/components/admin/content/practice/practice-studio-view";

export const metadata: Metadata = { title: "Practice Creation" };

export default function AdminContentPracticePage() {
  return (
    <div>
      <AdminContentSectionTabs active="practice" />
      <PracticeStudioView />
    </div>
  );
}
