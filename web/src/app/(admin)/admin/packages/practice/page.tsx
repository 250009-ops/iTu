import type { Metadata } from "next";
import { PracticePackagesView } from "@/components/admin/practice-packages/practice-packages-view";

export const metadata: Metadata = { title: "Practice Packages" };

export default function AdminPackagesPracticePage() {
  return <PracticePackagesView />;
}
