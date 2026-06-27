import { AuthLayoutGate } from "@/components/auth/auth-layout-gate";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayoutGate>
      <div className="flex min-h-screen">
        <div className="hidden w-[45%] shrink-0 lg:block xl:w-[48%]">
          <AuthMarketingPanel />
        </div>
        <div className="flex flex-1 flex-col bg-white">
          <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
            <AuthShell>{children}</AuthShell>
          </div>
        </div>
      </div>
    </AuthLayoutGate>
  );
}
