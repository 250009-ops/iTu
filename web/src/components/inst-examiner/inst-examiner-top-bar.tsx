"use client";

import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { NotificationMenu } from "@/components/portal/notification-menu";
import { UserMenu } from "@/components/portal/user-menu";
import { InstExaminerBrandBar } from "@/components/inst-examiner/inst-examiner-brand-bar";
import { useInstExaminer } from "@/contexts/inst-examiner-context";

export function InstExaminerTopBar() {
  const { info } = useInstExaminer();
  const centerName = info?.center?.name;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 overflow-visible">
      <InstExaminerBrandBar />

      <div className="flex min-w-0 flex-1 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <BrandMarkIcon size="md" />
          <div>
            <p className="text-xs font-bold leading-tight text-navy">iTestU</p>
            <p className="text-[10px] text-muted">Centre Examiner</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {centerName && (
            <div className="hidden items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1.5 lg:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-navy text-[10px] font-bold text-white">
                {centerName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="leading-tight">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                  Your Center
                </p>
                <p className="text-xs font-semibold text-navy">{centerName}</p>
              </div>
            </div>
          )}
          <NotificationMenu />
          <div className="mx-1 hidden h-8 w-px bg-border sm:block" aria-hidden />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
