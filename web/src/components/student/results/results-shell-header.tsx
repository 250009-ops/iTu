import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type ResultsShellHeaderProps = {
  title?: string;
  subtitle: string;
  actions?: ReactNode;
};

export function ResultsShellHeader({
  title = "Exam Results",
  subtitle,
  actions,
}: ResultsShellHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-5 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div
            className="flex items-center gap-1.5 text-gray-400"
            style={{ fontSize: "12px" }}
          >
            <Link href="/student" className="font-medium hover:text-gray-600">
              Dashboard
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="font-medium text-gray-600">Exam Results</span>
          </div>
          <h1
            className="mt-1 font-black text-gray-900"
            style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          <p className="mt-0.5 text-gray-500" style={{ fontSize: "14px" }}>
            {subtitle}
          </p>
        </div>
        {actions}
      </div>
    </div>
  );
}
