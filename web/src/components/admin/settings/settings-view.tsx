"use client";

import { useState } from "react";
import { ChangePasswordPanel } from "@/components/admin/account/change-password-panel";
import { BandTablePanel } from "@/components/admin/settings/band-table-panel";
import { CommissionPanel } from "@/components/admin/settings/commission-panel";
import { ExamTimersPanel } from "@/components/admin/settings/exam-timers-panel";
import { GeneralSettingsPanel } from "@/components/admin/settings/general-settings-panel";
import { IntegrationsPanel } from "@/components/admin/settings/integrations-panel";
import { NotificationsPanel } from "@/components/admin/settings/notifications-panel";
import { SettingsFooter } from "@/components/admin/settings/settings-footer";
import { SettingsHeader } from "@/components/admin/settings/settings-header";
import { SettingsNav } from "@/components/admin/settings/settings-nav";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminSettingsProvider,
  useAdminSettings,
} from "@/contexts/admin-settings-context";
import type { SettingsTab } from "@/lib/admin/types";

const panels: Record<SettingsTab, React.ComponentType> = {
  general: GeneralSettingsPanel,
  exam_timers: ExamTimersPanel,
  commission: CommissionPanel,
  band_table: BandTablePanel,
  notifications: NotificationsPanel,
  integrations: IntegrationsPanel,
  account: ChangePasswordPanel,
};

function SettingsContent() {
  const { loading, error } = useAdminSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const Panel = panels[activeTab];
  const isAccountTab = activeTab === "account";

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <SettingsHeader />
          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className="w-full shrink-0 lg:w-56">
              <SettingsNav active={activeTab} onChange={setActiveTab} />
            </aside>
            <div className="min-w-0 flex-1 rounded-xl border border-border bg-white shadow-sm">
              <Panel />
              {!isAccountTab && <SettingsFooter />}
            </div>
          </div>
      </PortalPage>
    </ApiDataShell>
  );
}

export function SettingsView() {
  return (
    <AdminSettingsProvider>
      <SettingsContent />
    </AdminSettingsProvider>
  );
}
