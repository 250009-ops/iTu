import { ResultsShellHeader } from "@/components/student/results/results-shell-header";
import type { StudentPortal } from "@/lib/student/portal";

export function ResultsLoadingSkeleton({
  portal = "marketplace",
}: {
  portal?: StudentPortal;
}) {
  const isInstitution = portal === "institution";
  return (
    <div className="min-h-full bg-gray-50/60">
      <ResultsShellHeader
        portal={portal}
        subtitle={
          isInstitution
            ? "Loading your centre results…"
            : "Loading your results…"
        }
      />
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    </div>
  );
}
