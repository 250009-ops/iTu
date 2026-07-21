import type { Metadata } from "next";
import { ContentStudioView } from "@/components/admin/content/content-studio-view";

export const metadata: Metadata = { title: "Mock Creation" };

export default function AdminContentPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ContentStudioView />
    </div>
  );
}
