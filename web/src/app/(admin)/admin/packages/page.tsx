import type { Metadata } from "next";
import { PackagesView } from "@/components/admin/packages/packages-view";

export const metadata: Metadata = { title: "Mock Packages" };

export default function AdminPackagesPage() {
  return <PackagesView />;
}
