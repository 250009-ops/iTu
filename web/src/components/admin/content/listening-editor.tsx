"use client";

import { ContentTestEditor } from "@/components/admin/content/content-test-editor";
import { useAdminContent } from "@/contexts/admin-content-context";

export { ListeningAudioUpload } from "@/components/admin/content/listening-audio-upload";

export function ListeningEditor() {
  const { selectedTestId } = useAdminContent();
  return <ContentTestEditor module="listening" testId={selectedTestId} />;
}
