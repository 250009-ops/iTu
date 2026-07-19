"use client";

import { ApiDataShell } from "@/components/shared/api-data-shell";
import { CentreManagedBanner } from "@/components/inst-examiner/centre-managed-banner";
import { CredentialsCard } from "@/components/teacher/profile/credentials-card";
import { ProfileHeader } from "@/components/teacher/profile/profile-header";
import { ProfileHeroCard } from "@/components/teacher/profile/profile-hero-card";
import {
  PerformanceCard,
  SecurityCard,
} from "@/components/teacher/profile/performance-security-cards";
import { SessionActivityChart } from "@/components/teacher/profile/session-activity-chart";
import {
  CentreScopeCard,
  SpecialisationsCard,
} from "@/components/teacher/profile/specialisations-availability-cards";
import {
  TeacherProfileProvider,
  useTeacherProfile,
} from "@/contexts/teacher-profile-context";
import {
  ProfilePortalProvider,
  useProfilePortal,
} from "@/contexts/profile-portal-context";
import { useInstExaminer } from "@/contexts/inst-examiner-context";

export function InstExaminerProfileView() {
  const { info } = useInstExaminer();

  return (
    <ProfilePortalProvider variant="centre" centerName={info?.center?.name}>
      <TeacherProfileProvider>
        <ProfileContent />
      </TeacherProfileProvider>
    </ProfilePortalProvider>
  );
}

function ProfileContent() {
  const { loading, error } = useTeacherProfile();
  const { overviewLoading } = useProfilePortal();

  return (
    <ApiDataShell loading={loading || overviewLoading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <ProfileHeader />
          <CentreManagedBanner />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-2">
              <ProfileHeroCard />
              <PerformanceCard />
              <SecurityCard />
            </div>

            <div className="space-y-6 lg:col-span-3">
              <CredentialsCard />
              <SessionActivityChart />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <SpecialisationsCard />
                <CentreScopeCard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ApiDataShell>
  );
}
