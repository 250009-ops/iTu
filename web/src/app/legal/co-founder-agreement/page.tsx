import type { Metadata } from "next";
import { PrintableContract } from "@/components/legal/printable-contract";

export const metadata: Metadata = {
  title: "Co-Founder Operating Agreement",
  description:
    "Printable co-founder operating agreement for iTestU — Sarvarbek Erkinov & Ozodbek To'lqinov.",
  robots: { index: false, follow: false },
};

export default function CoFounderAgreementPage() {
  return <PrintableContract />;
}
