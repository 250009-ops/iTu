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
    // Google requires a square favicon that is a multiple of 48px; prefer PNGs.
    icon: [
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
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
