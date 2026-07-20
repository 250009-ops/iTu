import {
  studentPracticeShopPath,
  type AuthSession,
} from "@/lib/auth/session";

export type PracticeCtaTarget =
  | { kind: "link"; href: string; label: string }
  | { kind: "blocked"; label: string; hint: string };

/** Resolve marketing practice CTAs by auth state — never dump staff into GuestGuard → panel. */
export function resolvePracticeCta(
  session: AuthSession | null,
  isAuthenticated: boolean,
  labels?: { guest?: string; student?: string },
): PracticeCtaTarget {
  const guestLabel = labels?.guest ?? "Get practice packages";
  const studentLabel = labels?.student ?? "Open practice shop";

  if (!isAuthenticated || !session) {
    return { kind: "link", href: "/register/student", label: guestLabel };
  }

  if (session.role === "student") {
    return {
      kind: "link",
      href: studentPracticeShopPath(session),
      label: studentLabel,
    };
  }

  const roleName =
    session.role === "admin"
      ? "Admin"
      : session.role === "teacher"
        ? "Examiner"
        : "Edu Center";

  return {
    kind: "blocked",
    label: guestLabel,
    hint: `You're signed in as ${roleName}. Practice packages are available on student accounts — sign out, then create or use a student account.`,
  };
}
