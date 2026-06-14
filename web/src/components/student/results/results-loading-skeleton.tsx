import { ResultsShellHeader } from "@/components/student/results/results-shell-header";

export function ResultsLoadingSkeleton() {
  return (
    <div className="min-h-full bg-gray-50/60">
      <ResultsShellHeader subtitle="Loading your results…" />
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    </div>
  );
}
