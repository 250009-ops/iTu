import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function ScopedBanner({
  centerName,
  message,
}: {
  centerName: string;
  message?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
        <ShieldCheck className="h-4 w-4" />
      </span>
      <div className="text-sm text-slate-600">
        <span className="font-semibold text-navy">Scoped access: </span>
        {message ?? (
          <>
            You see and grade only students enrolled through{" "}
            <span className="font-semibold text-navy">{centerName}</span>.
            Marketplace availability and independent payouts are managed by the
            centre.
          </>
        )}
      </div>
    </div>
  );
}
