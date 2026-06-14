import type { ReactNode } from "react";
import { Glow, Pill } from "./primitives";
import { Reveal } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

// Navy hero band for inner pages: glow blobs, dot grid, centered heading,
// and a soft curved divider into the light body below.
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden bg-navy", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
      <Glow className="-left-20 top-0 h-80 w-80" color="rgba(14,165,233,0.25)" />
      <Glow className="-right-20 top-10 h-80 w-80" color="rgba(139,92,246,0.22)" />

      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-32 text-center sm:pt-40">
        <Reveal direction="none">
          <div className="flex flex-col items-center gap-5">
            {eyebrow ? <Pill tone="onNavy">{eyebrow}</Pill> : null}
            <h1 className="text-4xl font-bold tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
                {subtitle}
              </p>
            ) : null}
            {children}
          </div>
        </Reveal>
      </div>

      <WaveDivider />
    </section>
  );
}

export function WaveDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className={cn("block h-10 w-full text-background", className)}
    >
      <path
        fill="currentColor"
        d="M0,32 C360,64 1080,0 1440,32 L1440,60 L0,60 Z"
      />
    </svg>
  );
}
