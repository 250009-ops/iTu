import type { Metadata } from "next";
import { TeachersView } from "@/components/admin/teachers/teachers-view";

export const metadata: Metadata = { title: "Teachers Management" };

export default function AdminTeachersPage() {
  return <TeachersView />;
}
