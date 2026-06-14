import type { Metadata } from "next";
import { AvailabilityView } from "@/components/teacher/availability/availability-view";

export const metadata: Metadata = { title: "Availability Calendar" };

export default function TeacherAvailabilityPage() {
  return <AvailabilityView />;
}
