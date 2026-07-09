import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Documents",
  robots: { index: false, follow: false },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] print:bg-white">{children}</div>
  );
}
