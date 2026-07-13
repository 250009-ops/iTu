"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  pathnameToView,
  STUDENT_VIEW_LABELS,
  type StudentView,
} from "@/lib/student/routes";
import { HelpSupportView } from "@/components/portal/help-support-view";
import { NotificationsCenter } from "@/components/portal/notifications-center";
import { BrowseView } from "@/components/student/views/browse-view";
import { DashboardView } from "@/components/student/views/dashboard-view";
import { MockDayView } from "@/components/student/views/mock-day-view";
import { ProfileView } from "@/components/student/views/profile-view";
import { ResultsView } from "@/components/student/views/results-view";

function StudentHelpView() {
  return <HelpSupportView role="student" />;
}

const VIEW_COMPONENTS: Record<StudentView, React.ComponentType> = {
  dashboard: DashboardView,
  browse: BrowseView,
  "mock-day": MockDayView,
  results: ResultsView,
  profile: ProfileView,
  notifications: NotificationsCenter,
  help: StudentHelpView,
};

export function StudentViewRouter() {
  const pathname = usePathname();
  const activeView = useMemo(() => pathnameToView(pathname), [pathname]);
  const View = VIEW_COMPONENTS[activeView];

  useEffect(() => {
    document.title = `${STUDENT_VIEW_LABELS[activeView]} | itestu Platform`;
  }, [activeView]);

  return (
    <div key={activeView} className="animate-fade-in">
      <View />
    </div>
  );
}
