import type { Metadata } from "next";
import { TeacherProfileView } from "@/components/teacher/profile/teacher-profile-view";

export const metadata: Metadata = { title: "My Profile" };

export default function TeacherProfilePage() {
  return <TeacherProfileView />;
}
