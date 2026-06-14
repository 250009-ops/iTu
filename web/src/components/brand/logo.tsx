import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
}

export function Logo({ variant = "dark", className }: LogoProps) {
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMarkIcon size="lg" />
      <div>
        <p
          className={cn(
            "text-sm font-bold leading-tight",
            isLight ? "text-white" : "text-navy",
          )}
        >
          itestu
        </p>
        <p
          className={cn(
            "text-xs leading-tight",
            isLight ? "text-slate-400" : "text-muted",
          )}
        >
          Computer-Based Testing
        </p>
      </div>
    </div>
  );
}
