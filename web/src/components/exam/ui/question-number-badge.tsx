import { cn } from "@/lib/utils";

type Props = {
  n: number | string;
  active?: boolean;
  className?: string;
};

export function QuestionNumberBadge({ n, active, className }: Props) {
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
