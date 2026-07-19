import type { Metadata } from "next";
import { InstitutionLiveMonitorView } from "@/components/institution/monitor/institution-live-monitor-view";

export const metadata: Metadata = { title: "Live Monitor" };

export default function InstitutionMonitorPage() {
  return <InstitutionLiveMonitorView />;
}
