import { cn } from "@/lib/utils";

type Props = {
  n: number | string;
  active?: boolean;
  /** IDP CD outline box (reading TFNG / YNG). */
  variant?: "filled" | "outline";
  className?: string;
};

export function QuestionNumberBadge({
  n,
  active,
  variant = "filled",
  className,
}: Props) {
  if (variant === "outline") {
    return (
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-black bg-white text-[11px] font-normal leading-none text-black",
          active && "ring-1 ring-blue-600 ring-offset-1",
          className,
        )}
      >
        {n}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold text-white",
        active ? "bg-brand-red ring-2 ring-brand-red/30" : "bg-navy",
        className,
      )}
    >
      {n}
    </span>
  );
}
