"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ProfileHero,
  type ProfileTab,
} from "@/components/student/profile/profile-hero";
import { ProfileHeader } from "@/components/student/profile/profile-header";
import { ProfileOverviewTab } from "@/components/student/profile/profile-overview-tab";
import { ProfilePlanTab } from "@/components/student/profile/profile-plan-tab";
import {
  ProfileNotificationsTab,
  ProfileSecurityTab,
} from "@/components/student/profile/profile-settings-tabs";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  StudentProfileProvider,
  useStudentProfileData,
} from "@/contexts/student-profile-context";

const VALID_TABS: ProfileTab[] = [
  "overview",
  "plan",
  "security",
  "notifications",
];

export function ProfileView() {
  return (
    <StudentProfileProvider>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-muted">
            Loading profile…
          </div>
        }
      >
        <ProfileViewWithParams />
      </Suspense>
    </StudentProfileProvider>
  );
}

function ProfileViewWithParams() {
  const searchParams = useSearchParams();
  return <ProfileViewContent searchParams={searchParams} />;
}

function ProfileViewContent({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const requested = searchParams.get("tab");
  const initialTab: ProfileTab =
    requested && VALID_TABS.includes(requested as ProfileTab)
      ? (requested as ProfileTab)
      : "overview";
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const { profile, loading, error } = useStudentProfileData();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && VALID_TABS.includes(tab as ProfileTab)) {
      setActiveTab(tab as ProfileTab);
    }
  }, [searchParams]);

  return (
    <ApiDataShell loading={loading} error={error} empty={!profile}>
      {profile && (
        <div>
          <ProfileHeader />
          <ProfileHero activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
            {activeTab === "overview" && <ProfileOverviewTab />}
            {activeTab === "security" && <ProfileSecurityTab />}
            {activeTab === "notifications" && <ProfileNotificationsTab />}

            {activeTab === "plan" && <ProfilePlanTab />}
          </div>
        </div>
      )}
    </ApiDataShell>
  );
}
