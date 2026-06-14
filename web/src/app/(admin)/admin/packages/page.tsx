import type { Metadata } from "next";
import { PackagesView } from "@/components/admin/packages/packages-view";

export const metadata: Metadata = { title: "Packages & Pricing" };

export default function AdminPackagesPage() {
  return <PackagesView />;
}
