"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useStudentProfileData } from "@/contexts/student-profile-context";

type ProfileHeaderProps = {
  portal?: "marketplace" | "institution";
};

export function ProfileHeader({ portal = "marketplace" }: ProfileHeaderProps) {
  const { refresh } = useStudentProfileData();
  const [refreshing, setRefreshing] = useState(false);
  const dashboardHref =
    portal === "institution" ? "/inst-student" : "/student";

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-5 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-gray-400" style={{ fontSize: "12px" }}>
            <Link href={dashboardHref} className="font-medium hover:text-gray-600">
              Dashboard
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="font-medium text-gray-600">My Profile</span>
          </div>
          <h1
            className="mt-1 font-black text-gray-900"
            style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
          >
            My Profile
          </h1>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          style={{ fontSize: "14px" }}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
