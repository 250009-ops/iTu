import type { Metadata } from "next";
import { HelpSupportView } from "@/components/portal/help-support-view";

export const metadata: Metadata = { title: "Help & Support" };

export default function InstitutionHelpPage() {
  return <HelpSupportView role="institution" />;
}
