"use client";

import type { ReactNode } from "react";
import { isDesktopShell } from "@/lib/desktop/shim";
import { AuthShell } from "./auth-shell";

interface AuthDesktopFrameProps {
  marketingPanel: ReactNode;
  children: ReactNode;
}

export function AuthDesktopFrame({
  marketingPanel,
  children,
}: AuthDesktopFrameProps) {
  const desktop = isDesktopShell();

  return (
    <div className="flex min-h-screen">
      {!desktop ? (
        <div className="hidden w-[45%] shrink-0 lg:block xl:w-[48%]">
          {marketingPanel}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <AuthShell>{children}</AuthShell>
        </div>
      </div>
    </div>
  );
}
