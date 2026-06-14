"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import { useAuth } from "@/hooks/use-auth";

export function WelcomeSection() {
  const { session } = useAuth();
  const { data } = useStudentDashboardData();

  const name = data?.user.name ?? session?.name ?? "Student";
  const firstName = name.split(" ")[0];
  const targetBand = data?.user.targetBand;
  const examType =
    data?.user.examType === "general_training" ? "General Training" : "Academic";
  const mocksCompleted = data?.user.mocksCompleted ?? 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm text-muted">
          {greeting} · {dateStr}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {targetBand != null && (
            <>
              Target Band{" "}
              <span className="font-semibold text-foreground">
                {targetBand.toFixed(1)}
              </span>
              {" · "}
            </>
          )}
          {examType}
          {" · "}
          <span className="font-semibold text-foreground">{mocksCompleted}</span>{" "}
          mocks completed
        </p>
      </div>
      <Link href="/student/browse" className="shrink-0">
        <Button variant="danger" size="lg" className="w-full shadow-sm sm:w-auto">
          <Sparkles className="h-4 w-4" />
          Book New Mock
        </Button>
      </Link>
    </div>
  );
}
