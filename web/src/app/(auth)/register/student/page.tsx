import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterForm from "../register-form";

export const metadata: Metadata = {
  title: "Student Registration",
};

export default function StudentRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
