import type { Metadata } from "next";
import { AdminPackagesSectionTabs } from "@/components/admin/admin-section-tabs";
import { PracticePackagesView } from "@/components/admin/practice-packages/practice-packages-view";

export const metadata: Metadata = { title: "Practice & AI Packages" };

export default function AdminPackagesPracticePage() {
  return (
    <div>
      <AdminPackagesSectionTabs active="practice" />
      <PracticePackagesView />
    </div>
  );
}
