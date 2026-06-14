"use client";

import { useTeacherDashboard } from "@/contexts/teacher-dashboard-context";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TeacherWelcomeSection() {
  const { teacherUser } = useTeacherDashboard();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        {getGreeting()}, {teacherUser.shortName}
      </h1>
      <p className="mt-1 text-sm text-muted">{today}</p>
    </div>
  );
}
