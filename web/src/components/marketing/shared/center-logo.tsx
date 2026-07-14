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

// Renders a partner centre's uploaded logo, or a clean navy monogram fallback
// so the marketing surfaces never show a broken image.
export function CenterLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border border-border bg-white",
          SIZES[size],
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
        />
      </div>
    );
  }

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
