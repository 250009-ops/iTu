import type { AccentColor } from "@/lib/marketing/data";

// Full literal class strings per accent so Tailwind's compiler can see them.
export const ACCENT: Record<
  AccentColor,
  {
    text: string;
    softBg: string;
    softBorder: string;
    iconBg: string;
    bar: string;
    dot: string;
    ring: string;
    topBorder: string;
    gradient: string;
  }
> = {
  sky: {
    text: "text-sky-600",
    softBg: "bg-sky-50",
    softBorder: "border-sky-100",
    iconBg: "bg-sky-100 text-sky-600",
    bar: "bg-sky-500",
    dot: "bg-sky-500",
    ring: "ring-sky-200",
    topBorder: "border-t-sky-400",
    gradient: "from-sky-400/30 to-sky-600/10",
  },
  emerald: {
    text: "text-emerald-600",
    softBg: "bg-emerald-50",
    softBorder: "border-emerald-100",
    iconBg: "bg-emerald-100 text-emerald-600",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    topBorder: "border-t-emerald-400",
    gradient: "from-emerald-400/30 to-emerald-600/10",
  },
  violet: {
    text: "text-violet-600",
    softBg: "bg-violet-50",
    softBorder: "border-violet-100",
    iconBg: "bg-violet-100 text-violet-600",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
    ring: "ring-violet-200",
    topBorder: "border-t-violet-400",
    gradient: "from-violet-400/30 to-violet-600/10",
  },
  rose: {
    text: "text-rose-600",
    softBg: "bg-rose-50",
    softBorder: "border-rose-100",
    iconBg: "bg-rose-100 text-rose-600",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    topBorder: "border-t-rose-400",
    gradient: "from-rose-400/30 to-rose-600/10",
  },
};

export const SPECIALITY_ACCENT: Record<string, AccentColor> = {
  Writing: "violet",
  Speaking: "rose",
  "Writing & Speaking": "sky",
};
