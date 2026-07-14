import { cn } from "@/lib/utils";

function monogram(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const SIZES = {
  sm: "h-11 w-11 text-sm rounded-lg",
  md: "h-14 w-14 text-base rounded-xl",
  lg: "h-20 w-20 text-2xl rounded-2xl",
} as const;

/** Monogram-only centre mark — uploaded logos are not shown on public marketing. */
export function CenterLogo({
  name,
  size = "md",
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-navy to-navy-light font-bold text-white",
        SIZES[size],
        className,
      )}
    >
      {monogram(name)}
    </div>
  );
}
