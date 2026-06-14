import type { Metadata } from "next";
import { DisputesView } from "@/components/admin/disputes/disputes-view";

export const metadata: Metadata = { title: "Disputes & Support" };

export default function AdminDisputesPage() {
  return <DisputesView />;
}
