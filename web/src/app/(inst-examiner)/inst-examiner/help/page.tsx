import type { Metadata } from "next";
import { HelpSupportView } from "@/components/portal/help-support-view";

export const metadata: Metadata = { title: "Help & Support | Centre Examiner" };

export default function InstExaminerHelpPage() {
  return <HelpSupportView role="inst_examiner" />;
}
