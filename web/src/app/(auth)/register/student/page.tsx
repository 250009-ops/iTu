import type { Metadata } from "next";
import RegisterForm from "../register-form";

export const metadata: Metadata = {
  title: "Student Registration",
};

export default function StudentRegisterPage() {
  return <RegisterForm />;
}
