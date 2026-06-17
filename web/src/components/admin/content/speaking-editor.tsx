"use client";

import { ContentTestEditor } from "@/components/admin/content/content-test-editor";
import { useAdminContent } from "@/contexts/admin-content-context";

export function SpeakingEditor({ initialTab }: { initialTab?: "visual" | "preview" | "advanced" }) {
  const { selectedTestId } = useAdminContent();
  return (
    <ContentTestEditor module="speaking" testId={selectedTestId} initialTab={initialTab} />
  );
}
