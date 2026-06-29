import {
  Calendar,
  Clock,
  Download,
  Mic,
  Star,
} from "lucide-react";
import { useStudentProfileData } from "@/contexts/student-profile-context";

const iconMap = {
  star: Star,
  mic: Mic,
  download: Download,
  calendar: Calendar,
};

export function ProfileRecentActivity() {
  const { profile } = useStudentProfileData();
  if (!profile) return null;
  const activities = profile.recentActivity;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Clock size={16} className="text-gray-500" />
        <h3 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
          Recent Activity
        </h3>
      </div>
      {activities.length === 0 ? (
        <p className="py-4 text-center text-gray-500" style={{ fontSize: "13px" }}>
          Booking and exam activity will show up here.
        </p>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <div key={item.id} className="flex items-center gap-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900" style={{ fontSize: "13px" }}>
                    {item.title}
                  </p>
                  <p className="text-gray-500" style={{ fontSize: "11px" }}>
                    {item.sub}
                  </p>
                </div>
                <Icon size={14} className="shrink-0 text-gray-300" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
