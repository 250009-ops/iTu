import type { Metadata } from "next";
import { InstStudentMyMockView } from "@/components/inst-student/my-mock-view";

export const metadata: Metadata = { title: "My Mock | Centre Student" };

export default function InstStudentMyMockPage() {
  return <InstStudentMyMockView />;
}
