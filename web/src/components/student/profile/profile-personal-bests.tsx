import { Trophy } from "lucide-react";
import { useStudentProfileData } from "@/contexts/student-profile-context";

export function ProfilePersonalBests() {
  const { profile } = useStudentProfileData();
  if (!profile) return null;
  const bests = profile.personalBests;
  const hasScores = profile.scoreHistory.length > 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" />
        <h3 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
          Personal Bests
        </h3>
      </div>
      {!hasScores ? (
        <p className="py-4 text-center text-gray-500" style={{ fontSize: "13px" }}>
          Complete a mock to see your best scores per skill.
        </p>
      ) : (
        <div className="space-y-3">
          {bests.map((item) => (
            <div key={item.module} className="flex items-center gap-3">
              <span className="w-20 text-gray-600" style={{ fontSize: "13px" }}>
                {item.module}
              </span>
              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(item.band / 9) * 100}%`,
                    background: item.color,
                  }}
                />
              </div>
              <span className="w-8 text-right font-black text-gray-900" style={{ fontSize: "14px" }}>
                {item.band > 0 ? item.band : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
