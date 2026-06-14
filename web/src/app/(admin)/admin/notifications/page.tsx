import type { Metadata } from "next";
import { NotificationsCenter } from "@/components/portal/notifications-center";

export const metadata: Metadata = { title: "Notifications" };

export default function AdminNotificationsPage() {
  return <NotificationsCenter />;
}
