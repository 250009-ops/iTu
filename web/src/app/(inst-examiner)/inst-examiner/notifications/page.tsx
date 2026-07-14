import type { Metadata } from "next";
import { NotificationsCenter } from "@/components/portal/notifications-center";

export const metadata: Metadata = { title: "Notifications | Centre Examiner" };

export default function InstExaminerNotificationsPage() {
  return <NotificationsCenter />;
}
