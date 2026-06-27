"use client";

import Link from "next/link";
import {
  Camera,
  Mic,
  Play,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MappedSpeakingSessionItem } from "@/lib/api/mappers/teacher";
import { cn } from "@/lib/utils";

export function NextSessionHero({
  session,
  minutesUntilNext,
}: {
  session: MappedSpeakingSessionItem;
  minutesUntilNext: number | null;
}) {
  const countdown =
    minutesUntilNext != null && minutesUntilNext > 0
      ? `${minutesUntilNext} min`
      : session.uiStatus === "live"
        ? "Now"
        : "Soon";

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
        Next session
      </p>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                session.colors.bg,
                session.colors.text,
              )}
            >
              {session.initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-navy">{session.studentName}</h2>
              <p className="mt-0.5 text-sm text-muted">{session.sessionSubtitle}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ReadinessBadge icon={Wifi} label="Connection ready" />
            <ReadinessBadge icon={Mic} label="Mic detected" />
            <ReadinessBadge icon={Camera} label="Camera on" />
          </div>

          <Link href={`/teacher/speaking?session=${session.id}&live=1`} className="mt-5 inline-block">
            <Button variant="danger" size="lg" className="shadow-md">
              <Play className="h-4 w-4 fill-current" />
              Enter live console
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4 lg:border-l lg:border-border lg:pl-8">
          <div className="text-left lg:text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Starts in
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-brand-red">
              {countdown}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessBadge({
  icon: Icon,
  label,
}: {
  icon: typeof Wifi;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
