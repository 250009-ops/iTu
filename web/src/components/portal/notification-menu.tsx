"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Info,
  Trophy,
} from "lucide-react";
import type { NotificationType } from "@/lib/notifications/types";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/lib/api/notifications";
import { useAuth } from "@/hooks/use-auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useToast } from "@/components/ui/toast";
import { notificationsPath } from "@/lib/portal/links";
import { cn } from "@/lib/utils";

type UiNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  href?: string;
};

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
  return `${Math.floor(hours / 24)}d ago`;
}

function toUiNotification(n: ApiNotification): UiNotification {
  return {
    id: n.id,
    type: mapApiType(n.type),
    title: n.title,
    message: n.body,
    time: formatRelativeTime(n.createdAt),
    read: n.isRead,
    href: n.link ?? undefined,
  };
}

function NotificationRow({
  item,
  onClick,
}: {
  item: UiNotification;
  onClick: () => void;
}) {
  const { icon: Icon, className } = iconMap[item.type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
        !item.read && "bg-sky-50/40",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          className,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <p className="line-clamp-2 text-xs text-muted">{item.message}</p>
      </div>
      <span className="shrink-0 text-[10px] text-muted">{item.time}</span>
    </button>
  );
}

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UiNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { session, isAuthenticated } = useAuth();

  useClickOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    void listNotifications()
      .then((data) => setItems(data.map(toUiNotification)))
      .catch(() => {
        // Silently fall back to empty — API may be offline during dev
        setItems([]);
      });
  }, [isAuthenticated, session?.accessToken]);

  const unreadCount = items.filter((n) => !n.read).length;

  async function handleItemClick(item: UiNotification) {
    setOpen(false);
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
        );
      } catch {
        // non-blocking
      }
    }
    if (item.href) {
      router.push(item.href);
    } else {
      router.push(notificationsPath(session?.role));
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      toast("All caught up", { description: "Notifications marked as read." });
    } catch {
      toast("Could not update notifications", { description: "Try again later." });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted transition-colors hover:bg-slate-50 hover:text-foreground",
          open && "bg-slate-50 text-foreground",
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold text-navy">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium text-brand-red hover:text-brand-red-hover"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No notifications yet
              </p>
            ) : (
              items.slice(0, 6).map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onClick={() => void handleItemClick(item)}
                />
              ))
            )}
          </div>

          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(notificationsPath(session?.role));
              }}
              className="w-full rounded-lg py-2 text-center text-sm font-medium text-brand-red hover:bg-slate-50"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
