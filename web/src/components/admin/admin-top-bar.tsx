"use client";

import { BrandMarkIcon } from "@/components/brand/brand-mark";
import { NotificationMenu } from "@/components/portal/notification-menu";
import { UserMenu } from "@/components/portal/user-menu";
import { AdminBrandBar } from "@/components/admin/admin-brand-bar";

export function AdminTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 overflow-visible">
      <AdminBrandBar />

      <div className="flex min-w-0 flex-1 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <BrandMarkIcon size="md" />
          <div>
            <p className="text-xs font-bold leading-tight text-navy">iTestU</p>
            <p className="text-[10px] text-amber-600">Admin Portal</p>
          </div>
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
