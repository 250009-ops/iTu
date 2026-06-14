"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  Info,
  Trophy,
} from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/lib/api/notifications";
import type {
  NotificationGroup,
  NotificationItem,
  NotificationType,
} from "@/lib/notifications/types";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const iconMap: Record<
  NotificationType,
  { icon: typeof Trophy; className: string }
> = {
  results: { icon: Trophy, className: "bg-sky-100 text-sky-600" },
  schedule: { icon: CalendarDays, className: "bg-violet-100 text-violet-600" },
  graded: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-600" },
  payment: { icon: CreditCard, className: "bg-amber-100 text-amber-600" },
  system: { icon: Info, className: "bg-slate-100 text-slate-600" },
};

const GROUP_ORDER: NotificationGroup[] = ["Today", "This week", "Earlier"];

type FilterKey = "all" | "unread";

function mapApiType(type: string): NotificationType {
  switch (type) {
    case "result":
      return "results";
    case "reminder":
      return "schedule";
    case "grading":
      return "graded";
    case "payment":
      return "payment";
    default:
      return "system";
  }
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function notificationGroup(createdAt: string): NotificationGroup {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = diff / (60 * 60 * 1000);
  if (hours < 24) return "Today";
  if (hours < 24 * 7) return "This week";
  return "Earlier";
}

function toUiNotification(n: ApiNotification): NotificationItem {
  return {
    id: n.id,
    type: mapApiType(n.type),
    title: n.title,
    detail: n.body,
    time: formatRelativeTime(n.createdAt),
    read: n.isRead,
    group: notificationGroup(n.createdAt),
    href: n.link ?? undefined,
  };
}

export function NotificationsCenter() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    void listNotifications()
      .then((data) => setItems(data.map(toUiNotification)))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, session?.accessToken]);

  const unreadCount = items.filter((i) => !i.read).length;

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((i) => !i.read) : items),
    [items, filter],
  );

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      rows: visible.filter((i) => (i.group ?? "Earlier") === group),
    })).filter((g) => g.rows.length > 0);
  }, [visible]);

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      toast("All notifications marked as read");
    } catch {
      toast("Could not update notifications", { description: "Try again later." });
    }
  }

  async function toggleRead(item: NotificationItem) {
    const nextRead = !item.read;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, read: nextRead } : i)),
    );
    if (nextRead) {
      try {
        await markNotificationRead(item.id);
      } catch {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, read: item.read } : i)),
        );
      }
    }
    if (item.href) {
      router.push(item.href);
    }
  }

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
                  <Bell className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-navy">
                    Notifications
                  </h1>
                  <p className="text-sm text-muted">
                    {unreadCount > 0
                      ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
                      : "You're all caught up"}
                  </p>
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-50"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="inline-flex rounded-lg border border-border bg-white p-0.5">
            {(["all", "unread"] as FilterKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
                  filter === key
                    ? "bg-navy text-white"
                    : "text-muted hover:text-navy",
                )}
              >
                {key}
                {key === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
              <Bell className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-semibold text-navy">No notifications</p>
              <p className="mt-1 text-sm text-muted">
                {filter === "unread"
                  ? "You have no unread notifications."
                  : "Notifications about your mocks and results will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ group, rows }) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                    {group}
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                    <div className="divide-y divide-border">
                      {rows.map((item) => {
                        const { icon: Icon, className } = iconMap[item.type];
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void toggleRead(item)}
                            className={cn(
                              "flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50",
                              !item.read && "bg-sky-50/40",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                className,
                              )}
                            >
                              <Icon className="h-5 w-5" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold text-navy">
                                  {item.title}
                                </p>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="text-xs text-muted">
                                    {item.time}
                                  </span>
                                  {!item.read && (
                                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                                  )}
                                </div>
                              </div>
                              <p className="mt-0.5 text-sm text-muted">
                                {item.detail}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ApiDataShell>
  );
}
