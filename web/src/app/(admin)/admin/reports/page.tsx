import type { Metadata } from "next";
import { ReportsView } from "@/components/admin/reports/reports-view";

export const metadata: Metadata = { title: "Reports & Analytics" };

export default function AdminReportsPage() {
  return <ReportsView />;
}
