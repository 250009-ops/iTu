import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { DesktopBridge } from "@/components/desktop/desktop-bridge";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.itestu.uz"),
  title: {
    default: "iTestU — IELTS Mock Exams",
    template: "%s | iTestU",
  },
  description:
    "iTestU (iTu) — professional computer-delivered IELTS mocks with examiner feedback, plus Reading, Listening, and AI Writing practice packages.",
  icons: {
    // Google wants square PNGs that are multiples of 48px. Keep favicon.ico in
    // public/ only — app/favicon.ico is auto-injected first as 256x256 (invalid).
    icon: [
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans antialiased">
        <ToastProvider>
          <DesktopBridge />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
