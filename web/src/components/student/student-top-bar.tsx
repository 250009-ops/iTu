"use client";

import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { NotificationMenu } from "@/components/portal/notification-menu";
import { PortalHeaderDownloadButton } from "@/components/portal/portal-header-download-button";
import { SearchBar } from "@/components/portal/search-bar";
import { UserMenu } from "@/components/portal/user-menu";
import { StudentBrandBar } from "@/components/student/student-brand-bar";

export function StudentTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 overflow-visible">
      <StudentBrandBar />

      <div className="flex min-w-0 flex-1 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <BrandMarkIcon size="md" />
          <div>
            <p className="text-xs font-bold leading-tight text-navy">iTestU</p>
            <p className="text-[10px] text-muted">Student Portal</p>
          </div>
        </div>

        <SearchBar
          placeholder="Search mocks, tests, sessions…"
          className="relative hidden min-w-0 flex-1 md:block md:max-w-xl"
        />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <PortalHeaderDownloadButton />
          <NotificationMenu />
          <div className="mx-1 hidden h-8 w-px bg-border sm:block" aria-hidden />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
