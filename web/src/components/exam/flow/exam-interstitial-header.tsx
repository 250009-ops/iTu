import { BrandMarkIcon } from "@/components/brand/brand-mark";

export function ExamInterstitialHeader({
  sessionId,
  label,
}: {
  sessionId: string;
  label: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700 bg-[#1b2a4a] px-4 text-white">
      <div className="flex items-center gap-3">
        <BrandMarkIcon size="md" />
        <span className="text-sm font-semibold">itestu · {label}</span>
      </div>
      <span className="hidden text-[13px] text-slate-300 sm:block">
        Test taker ID: <span className="font-semibold text-white">{sessionId}</span>
      </span>
    </header>
  );
}
