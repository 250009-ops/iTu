import type { Metadata } from "next";
import { InstExaminerDashboardView } from "@/components/inst-examiner/dashboard-view";

export const metadata: Metadata = { title: "Dashboard | Centre Examiner" };

export default function InstExaminerDashboardPage() {
  return <InstExaminerDashboardView />;
}
