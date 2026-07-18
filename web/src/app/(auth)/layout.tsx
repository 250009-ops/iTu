import { AuthLayoutGate } from "@/components/auth/auth-layout-gate";
import { AuthDesktopFrame } from "@/components/auth/auth-desktop-frame";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayoutGate>
      <AuthDesktopFrame marketingPanel={<AuthMarketingPanel />}>
        {children}
      </AuthDesktopFrame>
    </AuthLayoutGate>
  );
}
