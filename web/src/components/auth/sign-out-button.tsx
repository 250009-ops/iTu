"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        signOut();
        router.push("/login");
      }}
    >
      Sign out
    </button>
  );
}
