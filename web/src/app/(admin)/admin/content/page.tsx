import type { Metadata } from "next";
import { ContentStudioView } from "@/components/admin/content/content-studio-view";

export const metadata: Metadata = { title: "Mock Creation" };

export default function AdminContentPage() {
  return <ContentStudioView />;
}
