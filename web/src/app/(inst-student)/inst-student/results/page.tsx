import type { Metadata } from "next";
import { InstStudentResultsView } from "@/components/inst-student/results-view";

export const metadata: Metadata = { title: "Results | Centre Student" };

export default function InstStudentResultsPage() {
  return <InstStudentResultsView />;
}
