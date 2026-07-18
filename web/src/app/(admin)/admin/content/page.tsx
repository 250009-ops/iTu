import type { Metadata } from "next";
import { AdminContentSectionTabs } from "@/components/admin/admin-section-tabs";
import { ContentStudioView } from "@/components/admin/content/content-studio-view";

export const metadata: Metadata = { title: "Mock Creation" };

export default function AdminContentPage() {
  return (
    <div>
      <AdminContentSectionTabs active="mock" />
      <ContentStudioView />
    </div>
  );
}
