import type { Metadata } from "next";
import { RegisterRolePicker } from "@/components/auth/register-role-picker";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
  return <RegisterRolePicker />;
}
