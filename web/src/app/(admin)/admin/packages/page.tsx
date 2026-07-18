import type { Metadata } from "next";
import { AdminPackagesSectionTabs } from "@/components/admin/admin-section-tabs";
import { PackagesView } from "@/components/admin/packages/packages-view";

export const metadata: Metadata = { title: "Mock Packages" };

export default function AdminPackagesPage() {
  return (
    <div>
      <AdminPackagesSectionTabs active="mock" />
      <PackagesView />
    </div>
  );
}
