"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/marketing/data";

const SIZE_CONFIG = {
  sm: {
    box: "h-6 w-6 rounded",
    icon: "h-4 w-auto",
    text: "text-xs font-semibold",
    gap: "gap-1",
    shadow: "",
  },
  md: {
    box: "h-8 w-8 rounded-lg",
    icon: "h-6 w-auto",
    text: "text-lg font-bold",
    gap: "gap-1.5",
    shadow: "shadow-lg shadow-brand-red/30",
  },
  lg: {
    box: "h-9 w-9 rounded-lg",
    icon: "h-7 w-auto",
    text: "text-lg font-bold",
    gap: "gap-1.5",
    shadow: "shadow-lg shadow-brand-red/30",
  },
} as const;

export type BrandMarkSize = keyof typeof SIZE_CONFIG;

interface BrandMarkProps {
  size?: BrandMarkSize;
  showText?: boolean;
  textClassName?: string;
  className?: string;
}

export function BrandMark({
  size = "md",
  showText = true,
  textClassName,
  className,
}: BrandMarkProps) {
  const config = SIZE_CONFIG[size];

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-brand-red",
          config.box,
          config.shadow,
        )}
      >
        <Image
          src="/logo/itestu3.svg"
          alt=""
          aria-hidden
          width={24}
          height={24}
          unoptimized
          className={cn("h-auto w-auto", config.icon)}
        />
      </span>
      {showText ? (
        <span className={cn(config.text, textClassName ?? "text-white")}>
          {SITE.name}
        </span>
      ) : null}
    </div>
  );
}

interface BrandMarkIconProps {
  size?: BrandMarkSize;
  className?: string;
}

export function BrandMarkIcon({ size = "md", className }: BrandMarkIconProps) {
  const config = SIZE_CONFIG[size];

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-brand-red",
        config.box,
        config.shadow,
        className,
      )}
    >
      <Image
        src="/logo/itestu3.svg"
        alt=""
        aria-hidden
        width={24}
        height={24}
        unoptimized
        className={cn("h-auto w-auto", config.icon)}
      />
    </span>
  );
}
