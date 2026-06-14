import type { Metadata } from "next";
import { EnrollmentsView } from "@/components/admin/enrollments/enrollments-view";

export const metadata: Metadata = { title: "Enrollments" };

export default function AdminEnrollmentsPage() {
  return <EnrollmentsView />;
}
