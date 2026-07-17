"use client";

import { ContentTestEditor } from "@/components/admin/content/content-test-editor";
import { useAdminContent } from "@/contexts/admin-content-context";

export function SpeakingEditor({
  initialTab,
  focused,
}: {
  initialTab?: "visual" | "preview";
  focused?: boolean;
}) {
  const { selectedTestId } = useAdminContent();
  return (
    <ContentTestEditor
      module="speaking"
      testId={selectedTestId}
      initialTab={initialTab}
      focused={focused}
    />
  );
}
