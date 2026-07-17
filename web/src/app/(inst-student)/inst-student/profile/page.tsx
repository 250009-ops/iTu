import type { Metadata } from "next";
import { InstStudentProfileView } from "@/components/inst-student/profile-view";

export const metadata: Metadata = { title: "Profile | Centre Student" };

export default function InstStudentProfilePage() {
  return <InstStudentProfileView />;
}
