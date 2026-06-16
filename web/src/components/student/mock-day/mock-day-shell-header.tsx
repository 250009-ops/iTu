import Link from "next/link";
import { ChevronRight, Headphones } from "lucide-react";

type MockDayShellHeaderProps = {
  subtitle: string;
  showSupport?: boolean;
};

export function MockDayShellHeader({
  subtitle,
  showSupport = true,
}: MockDayShellHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-5 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div
            className="flex items-center gap-1.5 text-gray-400"
            style={{ fontSize: "12px" }}
          >
            <Link href="/student" className="font-medium hover:text-gray-600">
              Dashboard
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="font-medium text-gray-600">Mock Day Hub</span>
          </div>
          <h1
            className="mt-1 font-black text-gray-900"
            style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
          >
            Mock Day Hub
          </h1>
          <p className="mt-0.5 text-gray-500" style={{ fontSize: "14px" }}>
            {subtitle}
          </p>
        </div>

        {showSupport && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2">
              {["Network", "Mic", "Camera"].map((label) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-gray-400"
                  style={{ fontSize: "12px" }}
                >
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                  {label}
                </span>
              ))}
            </div>
            <a
              href="mailto:support@itestu.uz?subject=Mock%20day%20support"
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              style={{ fontSize: "13px" }}
            >
              <Headphones size={15} />
              Support
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
