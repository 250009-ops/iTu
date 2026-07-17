"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ProfileHero,
  type ProfileTab,
} from "@/components/student/profile/profile-hero";
import { ProfileHeader } from "@/components/student/profile/profile-header";
import { ProfilePersonalInfo } from "@/components/student/profile/profile-personal-info";
import { ProfilePlanTab } from "@/components/student/profile/profile-plan-tab";
import { ProfileSecurityTab } from "@/components/student/profile/profile-settings-tabs";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { useInstStudent } from "@/contexts/inst-student-context";
import {
  StudentProfileProvider,
  useStudentProfileData,
} from "@/contexts/student-profile-context";

const VALID_TABS: ProfileTab[] = ["overview", "plan", "security"];

export function InstStudentProfileView() {
  return (
    <StudentProfileProvider>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-muted">
            Loading profile…
          </div>
        }
      >
        <InstStudentProfileContent />
      </Suspense>
    </StudentProfileProvider>
  );
}

function InstStudentProfileContent() {
  const searchParams = useSearchParams();
  const { info } = useInstStudent();
  const requested = searchParams.get("tab");
  const initialTab: ProfileTab =
    requested && VALID_TABS.includes(requested as ProfileTab)
      ? (requested as ProfileTab)
      : "overview";
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const { profile, loading, error } = useStudentProfileData();

  const centerName = info?.center?.name ?? "Your centre";

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && VALID_TABS.includes(tab as ProfileTab)) {
      setActiveTab(tab as ProfileTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#goal") {
      setActiveTab("plan");
      requestAnimationFrame(() => {
        document.getElementById("goal")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, []);

  return (
    <ApiDataShell loading={loading} error={error} empty={!profile}>
      {profile && (
        <div>
          <ProfileHeader portal="institution" />
          <ProfileHero
            activeTab={activeTab}
            onTabChange={setActiveTab}
            portal="institution"
            institutionLabel={centerName}
          />

          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
            {activeTab === "overview" && <ProfilePersonalInfo />}
            {activeTab === "plan" && (
              <div id="goal">
                <ProfilePlanTab portal="institution" />
              </div>
            )}
            {activeTab === "security" && <ProfileSecurityTab />}
          </div>
        </div>
      )}
    </ApiDataShell>
  );
}
