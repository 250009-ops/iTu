import type { Metadata } from "next";
import { InstStudentDashboardView } from "@/components/inst-student/dashboard-view";

export const metadata: Metadata = { title: "Dashboard | Centre Student" };

export default function InstStudentDashboardPage() {
  return <InstStudentDashboardView />;
}
