"use client";

import { ContentTestEditor } from "@/components/admin/content/content-test-editor";
import { useAdminContent } from "@/contexts/admin-content-context";

export function WritingEditor({ initialTab }: { initialTab?: "visual" | "preview" }) {
  const { selectedTestId } = useAdminContent();
  return (
    <ContentTestEditor module="writing" testId={selectedTestId} initialTab={initialTab} />
  );
}
