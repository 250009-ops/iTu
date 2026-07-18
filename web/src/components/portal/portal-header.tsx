"use client";

import { NotificationMenu } from "@/components/portal/notification-menu";
import { PortalHeaderDownloadButton } from "@/components/portal/portal-header-download-button";
import { SearchBar } from "@/components/portal/search-bar";
import { UserMenu } from "@/components/portal/user-menu";

interface PortalHeaderProps {
  searchPlaceholder?: string;
}

export function PortalHeader({
  searchPlaceholder = "Search…",
}: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
      <SearchBar
        placeholder={searchPlaceholder}
        className="relative hidden min-w-0 flex-1 md:block md:max-w-xl"
      />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <PortalHeaderDownloadButton />
        <NotificationMenu />

        <div className="mx-1 hidden h-8 w-px bg-border sm:block" aria-hidden />

        <UserMenu />
      </div>
    </header>
  );
}
