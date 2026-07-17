import type { Metadata } from "next";
import { InstitutionHelpView } from "@/components/institution/institution-help-view";

export const metadata: Metadata = { title: "Help & Support" };

export default function InstitutionHelpPage() {
  return <InstitutionHelpView />;
}
