import type { Metadata } from "next";
import { AdminInstitutionsView } from "@/components/admin/institutions/institutions-view";

export const metadata: Metadata = { title: "Institutions" };

export default function AdminInstitutionsPage() {
  return <AdminInstitutionsView />;
}
