import type { Metadata } from "next";
import TeacherRegisterForm from "@/components/auth/teacher-register-form";

export const metadata: Metadata = {
  title: "Apply as Examiner",
};

export default function TeacherRegisterPage() {
  return <TeacherRegisterForm />;
}
