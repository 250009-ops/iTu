import { MockDayShellHeader } from "@/components/student/mock-day/mock-day-shell-header";

export function MockDayLoadingSkeleton() {
  return (
    <div>
      <MockDayShellHeader subtitle="Loading your mock day session…" showSupport={false} />
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    </div>
  );
}
