import type { Metadata } from "next";
import { InstitutionPackagesPanel } from "@/components/institution/content/institution-packages-panel";

export const metadata: Metadata = { title: "Private packages" };

export default function InstitutionPackagesPage() {
  return <InstitutionPackagesPanel />;
}
