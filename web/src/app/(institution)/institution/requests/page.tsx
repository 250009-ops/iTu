import type { Metadata } from "next";
import { CentreRequestsView } from "@/components/institution/centre-requests-view";

export const metadata: Metadata = { title: "Centre Requests" };

export default function InstitutionRequestsPage() {
  return <CentreRequestsView />;
}
