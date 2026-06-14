import type { UserRole } from "@/lib/auth/session";

type Role = UserRole | undefined;

/** Full notifications page for the current role's portal. */
export function notificationsPath(role: Role): string {
  switch (role) {
    case "teacher":
      return "/teacher/notifications";
    case "admin":
      return "/admin/notifications";
    default:
      return "/student/notifications";
  }
}

/** Help & support centre for the current role's portal. */
export function helpPath(role: Role): string {
  switch (role) {
    case "teacher":
      return "/teacher/help";
    case "admin":
      return "/admin/help";
    default:
      return "/student/help";
  }
}

/**
 * Account / platform settings destination.
 * Admins have a dedicated platform-settings console; students and teachers
 * manage account settings from their profile page.
 */
export function settingsPath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/settings";
    case "teacher":
      return "/teacher/profile";
    default:
      return "/student/profile?tab=security";
  }
}
