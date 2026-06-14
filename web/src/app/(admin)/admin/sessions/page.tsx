import type { Metadata } from "next";
import { LiveMonitorView } from "@/components/admin/monitor/live-monitor-view";

export const metadata: Metadata = { title: "Live Sessions Monitor" };

export default function AdminSessionsPage() {
  return <LiveMonitorView />;
}
