"use client";

import Link from "next/link";
import { ArrowRight, Bell, Clock, Mic, Pencil } from "lucide-react";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import { cn } from "@/lib/utils";

const iconConfig = {
  speaking: { icon: Mic, bg: "bg-sky-50 text-sky-600" },
  writing: { icon: Pencil, bg: "bg-violet-50 text-violet-600" },
  reminder: { icon: Clock, bg: "bg-amber-50 text-amber-600" },
  info: { icon: Bell, bg: "bg-slate-50 text-slate-600" },
  result: { icon: Bell, bg: "bg-emerald-50 text-emerald-600" },
  payment: { icon: Bell, bg: "bg-violet-50 text-violet-600" },
  grading: { icon: Pencil, bg: "bg-sky-50 text-sky-600" },
  system: { icon: Bell, bg: "bg-slate-50 text-slate-600" },
} as const;

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const { data } = useStudentDashboardData();
  const activities = data?.activities ?? [];
  const unread = activities.filter((a) => !a.isRead).length;

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="font-semibold text-navy">Activity</h3>
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">No recent activity</p>
      ) : (
        <ul className="divide-y divide-border">
          {activities.map((item) => {
            const typeKey = item.type as keyof typeof iconConfig;
            const config = iconConfig[typeKey] ?? iconConfig.info;
            const Icon = config.icon;

            return (
              <li key={item.id} className="flex gap-3 px-5 py-4">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    config.bg,
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {formatRelativeTime(item.time)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PreparationTip() {
  return (
    <div className="rounded-xl bg-navy p-5 text-white shadow-sm">
      <div className="flex items-center gap-2 text-amber-400">
        <span className="text-lg">⚡</span>
        <span className="text-xs font-bold uppercase tracking-wider">
          Preparation Tip
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Practice timed writing tasks — aim for 150+ words in 20 min for Task 1 and
        250+ in 40 min for Task 2.
      </p>
      <Link
        href="/student/browse"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-400 hover:text-amber-300"
      >
        More tips
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
