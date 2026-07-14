import type { Metadata } from "next";
import { InstitutionSettingsView } from "@/components/institution/settings-view";

export const metadata: Metadata = { title: "Institution Settings" };

export default function InstitutionSettingsPage() {
  return <InstitutionSettingsView />;
}
