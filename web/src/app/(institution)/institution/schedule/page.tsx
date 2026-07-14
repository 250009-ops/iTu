import type { Metadata } from "next";
import { InstitutionScheduleView } from "@/components/institution/schedule-view";

export const metadata: Metadata = { title: "Mock Schedule" };

export default function InstitutionSchedulePage() {
  return <InstitutionScheduleView />;
}
