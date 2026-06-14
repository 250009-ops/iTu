import type { Metadata } from "next";
import { EarningsView } from "@/components/teacher/earnings/earnings-view";

export const metadata: Metadata = { title: "Earnings & Payments" };

export default function TeacherEarningsPage() {
  return <EarningsView />;
}
