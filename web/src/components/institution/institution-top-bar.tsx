"use client";

import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { NotificationMenu } from "@/components/portal/notification-menu";
import { UserMenu } from "@/components/portal/user-menu";
import { InstitutionBrandBar } from "@/components/institution/institution-brand-bar";
import { useInstitutionNavBadges } from "@/contexts/institution-nav-badges-context";

export function InstitutionTopBar() {
  const { centerName } = useInstitutionNavBadges();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 overflow-visible">
      <InstitutionBrandBar />

      <div className="flex min-w-0 flex-1 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <BrandMarkIcon size="md" />
          <div>
            <p className="text-xs font-bold leading-tight text-navy">itestu</p>
            <p className="text-[10px] text-amber-600">Institution Portal</p>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm font-semibold text-navy">
            {centerName ?? "Institution Portal"}
          </p>
          <p className="text-xs text-muted">Edu-center partner workspace</p>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <NotificationMenu />
          <div className="mx-1 hidden h-8 w-px bg-border sm:block" aria-hidden />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
