"use client";

import { ChangePasswordPanel } from "@/components/admin/account/change-password-panel";
import { PortalPage } from "@/components/portal/portal-page";

export function AccountView() {
  return (
    <PortalPage>
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Account Security
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your own admin login credentials.
        </p>
      </div>

      <div className="mt-6 max-w-2xl rounded-xl border border-border bg-white shadow-sm">
        <ChangePasswordPanel />
      </div>
    </PortalPage>
  );
}
