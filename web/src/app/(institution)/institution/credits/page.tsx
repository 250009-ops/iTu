import type { Metadata } from "next";
import { InstitutionCreditsView } from "@/components/institution/credits-view";

export const metadata: Metadata = { title: "Credits" };

export default function InstitutionCreditsPage() {
  return <InstitutionCreditsView />;
}
