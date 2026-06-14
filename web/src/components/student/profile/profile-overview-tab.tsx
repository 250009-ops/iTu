import { ProfileMockPackage } from "@/components/student/profile/profile-mock-package";
import { ProfilePersonalBests } from "@/components/student/profile/profile-personal-bests";
import { ProfilePersonalInfo } from "@/components/student/profile/profile-personal-info";
import { ProfileRecentActivity } from "@/components/student/profile/profile-recent-activity";
import { ProfileScoreHistory } from "@/components/student/profile/profile-score-history";
import { StudentReviewsPanel } from "@/components/student/reviews/student-reviews-panel";

export function ProfileOverviewTab() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <ProfilePersonalInfo />
        <ProfileMockPackage />
        <StudentReviewsPanel />
      </div>
      <div className="space-y-4 lg:col-span-4">
        <ProfileScoreHistory />
        <ProfilePersonalBests />
        <ProfileRecentActivity />
      </div>
    </div>
  );
}
