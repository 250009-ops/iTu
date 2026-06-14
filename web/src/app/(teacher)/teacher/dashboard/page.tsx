import type { Metadata } from "next";
import { TeacherDashboardView } from "@/components/teacher/dashboard/teacher-dashboard-view";

export const metadata: Metadata = { title: "Teacher Dashboard" };

export default function TeacherDashboardPage() {
  return <TeacherDashboardView />;
}
