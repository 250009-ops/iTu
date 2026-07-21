import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PortalPageProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Content max width — most portal tables use 7xl. */
  maxWidth?: "7xl" | "5xl" | "full";
  /** Disable default outer padding when a parent already handles it (e.g. tab shells). */
  noPadding?: boolean;
};

const MAX_WIDTH_CLASS = {
  "7xl": "max-w-7xl",
  "5xl": "max-w-5xl",
  full: "max-w-none",
} as const;

/** Full-width portal page shell — prevents flex shrink squeeze in admin/institution layouts. */
export function PortalPage({
  children,
  className,
  innerClassName,
  maxWidth = "7xl",
  noPadding = false,
}: PortalPageProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 flex-1",
        !noPadding && "p-4 lg:p-6 xl:p-8",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full min-w-0 space-y-6",
          MAX_WIDTH_CLASS[maxWidth],
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
