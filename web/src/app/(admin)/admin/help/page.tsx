import type { Metadata } from "next";
import { HelpCenter } from "@/components/portal/help-center";

export const metadata: Metadata = { title: "Help & Support" };

export default function AdminHelpPage() {
  return <HelpCenter />;
}
