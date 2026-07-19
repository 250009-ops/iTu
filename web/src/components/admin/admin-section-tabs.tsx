import Link from "next/link";
import { cn } from "@/lib/utils";

type AdminSectionTab = {
  label: string;
  href: string;
  active: boolean;
};

export function AdminSectionTabs({ tabs }: { tabs: AdminSectionTab[] }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
      <div className="mx-auto flex max-w-7xl gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab.active ? "bg-navy text-white" : "text-muted hover:bg-slate-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminContentSectionTabs({
  active,
}: {
  active: "mock" | "practice";
}) {
  return (
    <AdminSectionTabs
      tabs={[
        {
          label: "Mock Creation",
          href: "/admin/content",
          active: active === "mock",
        },
        {
          label: "Practice Creation",
          href: "/admin/content/practice",
          active: active === "practice",
        },
      ]}
    />
  );
}

export function AdminPackagesSectionTabs({
  active,
}: {
  active: "mock" | "practice" | "institution-sets";
}) {
  return (
    <AdminSectionTabs
      tabs={[
        {
          label: "Mock Packages",
          href: "/admin/packages",
          active: active === "mock",
        },
        {
          label: "Practice & AI Packages",
          href: "/admin/packages/practice",
          active: active === "practice",
        },
        {
          label: "Institution Mock Sets",
          href: "/admin/packages/institution-sets",
          active: active === "institution-sets",
        },
      ]}
    />
  );
}
