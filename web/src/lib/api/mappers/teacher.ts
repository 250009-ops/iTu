import type { getSpeakingSession } from "@/lib/api/grading";
import type {
  getTeacherAvailability,
  getTeacherDashboard,
  getTeacherEarnings,
  getTeacherProfile,
} from "@/lib/api/teachers";
import type { getWritingQueue } from "@/lib/api/grading";
import {
  speakingCriteria,
  type ScoringCriterion,
  type SpeakingPart,
} from "@/lib/speaking/scoring";

type Dashboard = Awaited<ReturnType<typeof getTeacherDashboard>>;
type WritingQueue = Awaited<ReturnType<typeof getWritingQueue>>;
type Earnings = Awaited<ReturnType<typeof getTeacherEarnings>>;
type Availability = Awaited<ReturnType<typeof getTeacherAvailability>>;
type Profile = Awaited<ReturnType<typeof getTeacherProfile>>;
type SpeakingSession = Awaited<ReturnType<typeof getSpeakingSession>>;

export type GradingStatus = "pending" | "in_review" | "graded";
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type SlotStatus = "empty" | "available" | "booked" | "blocked";

const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatSlotTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return minutes === 0 ? `${h}:00 ${period}` : `${h}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mapSlotStatus(status: string): SlotStatus {
  if (status === "booked") return "booked";
  if (status === "blocked") return "blocked";
  if (status === "available") return "available";
  return "empty";
}

export function mapTeacherStats(data: Dashboard) {
  return [
    {
      id: "sessions",
      label: "Today's Sessions",
      value: String(data.stats.sessionsToday),
      sub: `${data.speakingSchedule.length} scheduled`,
      trend: null,
      tone: "sky" as const,
    },
    {
      id: "writing",
      label: "Pending Writing",
      value: String(data.stats.writingQueue),
      sub: "Awaiting grading",
      trend: null,
      tone: "violet" as const,
    },
    {
      id: "earnings",
      label: "Total Earned",
      value: `$${data.stats.totalEarned.toFixed(0)}`,
      sub: "Lifetime earnings",
      trend: null,
      tone: "emerald" as const,
    },
    {
      id: "rating",
      label: "Rating",
      value: data.stats.rating?.toFixed(1) ?? "—",
      sub: "Examiner rating",
      trend: null,
      tone: "amber" as const,
    },
  ];
}

export function mapSpeakingSchedule(data: Dashboard) {
  return data.speakingSchedule.map((s) => ({
    id: s.id,
    studentName: s.studentName,
    initials: initialsFromName(s.studentName),
    timeRange: s.scheduledAt
      ? new Date(s.scheduledAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "TBD",
    sessionType: "Speaking Part 1–3",
    status:
      s.status === "active" || s.status === "waiting"
        ? ("live" as const)
        : ("upcoming" as const),
  }));
}

export function mapWritingQueue(queue: WritingQueue) {
  return queue.map((item) => {
    const date = new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      id: item.id,
      studentName: item.studentName,
      initials: initialsFromName(item.studentName),
      date,
      submittedAt: date,
      slaHours: item.slaHours,
      urgent: item.urgent,
      status: item.status as GradingStatus,
      wordCount: item.task1WordCount + item.task2WordCount,
    };
  });
}

export function mapGradingSummary(queue: WritingQueue) {
  const submissions = mapWritingQueue(queue);
  return {
    pendingGrading: submissions.filter((s) => s.status === "pending").length,
    inReview: submissions.filter((s) => s.status === "in_review").length,
    submissions,
  };
}

export function mapTeacherEarnings(data: Earnings) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const billingCycle = `${monthStart.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })} – ${monthEnd.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

  const thisMonthPayouts = data.payouts.filter((p) => {
    const d = new Date(p.periodEnd);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const thisMonth = thisMonthPayouts.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = data.payouts.filter((p) => p.status === "pending");
  const availableBalance = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

  const monthlyMap = new Map<string, number>();
  for (const payout of [...data.payouts].reverse()) {
    const d = new Date(payout.periodEnd);
    const key = d.toLocaleDateString("en-US", { month: "short" });
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + payout.amount);
  }
  const monthlyEarnings =
    monthlyMap.size > 0
      ? Array.from(monthlyMap.entries()).map(([month, amount]) => ({
          month,
          amount,
        }))
      : [
          {
            month: now.toLocaleDateString("en-US", { month: "short" }),
            amount: 0,
          },
        ];

  const weeklyRevenue = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day) => ({ day, speaking: 0, writing: 0 }),
  );

  const nextPending =
    pendingPayouts[0] ?? data.payouts.find((p) => p.status !== "paid");

  const payoutDetails = data.payoutDetails;
  const bankLabel =
    payoutDetails?.bankName && payoutDetails?.accountLast4
      ? `${payoutDetails.bankName} ···${payoutDetails.accountLast4}`
      : "No bank details on file";
  const methodLabel =
    payoutDetails?.method ?? "Bank transfer (2–3 business days)";

  const nextPayout = nextPending
    ? {
        date: new Date(nextPending.periodEnd).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        bank: bankLabel,
        method: methodLabel,
        projectedAmount: nextPending.amount,
        daysRemaining: Math.max(
          0,
          Math.ceil(
            (new Date(nextPending.periodEnd).getTime() - now.getTime()) /
              86_400_000,
          ),
        ),
        hasBankDetails: Boolean(payoutDetails?.accountLast4),
      }
    : {
        date: "TBD",
        bank: bankLabel,
        method: methodLabel,
        projectedAmount: 0,
        daysRemaining: 0,
        hasBankDetails: Boolean(payoutDetails?.accountLast4),
      };

  const transactions = data.payouts.map((payout) => ({
    id: payout.id,
    date: new Date(payout.periodEnd).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: payout.paidAt
      ? new Date(payout.paidAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    type: "payout" as const,
    label: payout.status === "paid" ? "Bank Payout" : "Pending Payout",
    detail: `${new Date(payout.periodStart).toLocaleDateString()} – ${new Date(payout.periodEnd).toLocaleDateString()}`,
    reference: payout.id.slice(0, 8).toUpperCase(),
    status:
      payout.status === "paid"
        ? ("withdrawn" as const)
        : ("completed" as const),
    amount: payout.status === "paid" ? -payout.amount : payout.amount,
  }));

  return {
    billingCycle,
    netThisCycle: thisMonth,
    summary: {
      availableBalance: availableBalance || thisMonth,
      thisMonth,
      thisMonthTrend: "—",
      thisMonthLabel: billingCycle,
      allTimeEarned: data.totalEarned,
      allTimeTrend: "—",
      allTimeSub: `${data.payouts.length} payouts on record`,
      avgPerSession:
        data.payouts.length > 0
          ? data.totalEarned / data.payouts.length
          : 0,
      avgTrend: "—",
      avgSub: `${Math.round(data.commissionRate * 100)}% commission rate`,
      monthlyTrend: "—",
    },
    monthlyEarnings,
    weeklyRevenue,
    nextPayout,
    transactions,
  };
}

export function mapTeacherAvailability(data: Availability) {
  const weekStart = getMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      key: DAY_KEYS[d.getDay()] as DayKey,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: String(d.getDate()),
    };
  });

  const weekSlots = data.slots.filter((slot) => {
    const startsAt = new Date(slot.startsAt);
    return startsAt >= weekStart && startsAt < weekEnd;
  });

  const timeSet = new Set<string>();
  for (const slot of weekSlots) {
    timeSet.add(formatSlotTime(new Date(slot.startsAt)));
  }
  for (const weekly of data.weekly) {
    timeSet.add(weekly.startTime);
    timeSet.add(weekly.endTime);
  }

  const timeSlots = Array.from(timeSet).sort((a, b) => {
    const parse = (value: string) => {
      const match = value.match(/(\d+):(\d+)/);
      if (!match) return 0;
      let hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (/pm/i.test(value) && hours < 12) hours += 12;
      if (/am/i.test(value) && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    return parse(a) - parse(b);
  });

  const slotGrid: Record<string, Partial<Record<DayKey, SlotStatus>>> = {};
  const slotIdGrid: Record<string, Partial<Record<DayKey, string>>> = {};
  for (const slot of weekSlots) {
    const startsAt = new Date(slot.startsAt);
    const dayKey = DAY_KEYS[startsAt.getDay()] as DayKey;
    const time = formatSlotTime(startsAt);
    slotGrid[time] = slotGrid[time] ?? {};
    slotGrid[time][dayKey] = mapSlotStatus(slot.status);
    slotIdGrid[time] = slotIdGrid[time] ?? {};
    slotIdGrid[time][dayKey] = slot.id;
  }

  const weekLabelEnd = new Date(weekStart);
  weekLabelEnd.setDate(weekStart.getDate() + 6);

  return {
    label: `Week of ${weekStart.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })} – ${weekLabelEnd.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`,
    stats: {
      available: weekSlots.filter((s) => s.status === "available").length,
      booked: weekSlots.filter((s) => s.status === "booked").length,
      blocked: weekSlots.filter((s) => s.status === "blocked").length,
      sessionDuration: data.weekly[0]
        ? `${data.weekly[0].slotDuration}-minute speaking sessions`
        : "20-minute speaking sessions",
    },
    days,
    timeSlots:
      timeSlots.length > 0
        ? timeSlots
        : ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM"],
    slotGrid,
    weekly: data.weekly,
    getSlotStatus(time: string, day: DayKey): SlotStatus {
      return slotGrid[time]?.[day] ?? "empty";
    },
    getSlotId(time: string, day: DayKey): string | null {
      return slotIdGrid[time]?.[day] ?? null;
    },
  };
}

function mapCredentials(profile: Profile) {
  const raw = profile.credentials;
  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (
        item &&
        typeof item === "object" &&
        "label" in item &&
        "value" in item
      ) {
        return {
          label: String(item.label),
          value: String(item.value),
        };
      }
      return { label: `Credential ${index + 1}`, value: String(item) };
    });
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(
      ([label, value]) => ({
        label,
        value: String(value),
      }),
    );
  }
  return [
    { label: "Full Name", value: profile.name },
    { label: "Email Address", value: profile.email },
    {
      label: "Specialisation",
      value: profile.speciality.replace(/_/g, " "),
    },
    { label: "Status", value: profile.status },
  ];
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function mapTeacherProfile(data: Profile) {
  const specialityLabel = data.speciality
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    name: data.name,
    initials: initialsFromName(data.name),
    avatarUrl: data.avatarUrl,
    title: `IELTS Examiner · ${specialityLabel}`,
    rating: data.rating ?? 0,
    reviewCount: data.totalSessions,
    email: data.email,
    location: "—",
    memberSince: "—",
    verified: data.status === "approved",
    online: data.status === "approved",
    bio: data.bio,
    credentials: mapCredentials(data),
    performance: [
      {
        label: "Total Sessions",
        value: data.totalSessions.toLocaleString(),
        pct: 100,
      },
      {
        label: "Rating",
        value: data.rating?.toFixed(1) ?? "—",
        pct: data.rating ? Math.min(100, (data.rating / 9) * 100) : 0,
      },
      {
        label: "Total Earned",
        value: `$${data.totalEarned.toFixed(0)}`,
        pct: Math.min(100, data.totalEarned / 100),
      },
      {
        label: "Account Status",
        value: specialityLabel,
        pct: data.status === "approved" ? 99 : 50,
      },
    ],
    security: [
      { label: "Email verified", status: "Active" },
      {
        label: "Account status",
        status: data.status === "approved" ? "Active" : "Pending",
      },
      { label: "Examiner profile", status: "Active" },
    ],
    sessionActivity: {
      trend: `${data.totalSessions} sessions completed`,
      months: [
        {
          month: new Date().toLocaleDateString("en-US", { month: "short" }),
          count: Math.min(60, data.totalSessions),
        },
      ],
    },
    specialisations: [
      specialityLabel,
      "IELTS Academic",
      "Speaking Assessment",
      "Writing Assessment",
    ],
    availability: [] as { days: string; hours: string; active: boolean }[],
  };
}

export function mapWeeklyAvailability(
  weekly: Availability["weekly"],
): { days: string; hours: string; active: boolean }[] {
  if (weekly.length === 0) {
    return [{ days: "Not configured", hours: "Set working hours", active: false }];
  }
  return weekly.map((slot) => ({
    days: DAY_NAMES[slot.dayOfWeek] ?? `Day ${slot.dayOfWeek}`,
    hours: `${slot.startTime} – ${slot.endTime}`,
    active: true,
  }));
}

export function mapSpeakingSession(data: SpeakingSession) {
  const defaultScores: Record<ScoringCriterion, number> = {
    fluency: 7,
    lexical: 7,
    grammar: 7,
    pronunciation: 7,
  };

  if (data.grade?.criteriaScores) {
    for (const [key, value] of Object.entries(data.grade.criteriaScores)) {
      if (key in defaultScores) {
        defaultScores[key as ScoringCriterion] = value;
      }
    }
  }

  let timeRange = "TBD";
  if (data.scheduledAt) {
    const start = new Date(data.scheduledAt);
    const end = new Date(start.getTime() + 20 * 60_000);
    const fmt = (d: Date) =>
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    timeRange = `${fmt(start)} – ${fmt(end)}`;
  }

  let activePart = 1 as SpeakingPart;
  if (data.activePhase === "part2-prep" || data.activePhase === "part2-speak") {
    activePart = 2;
  } else if (data.activePhase === "part3" || data.activePhase === "complete") {
    activePart = 3;
  }

  return {
    id: data.id,
    studentName: data.studentName,
    studentInitials: initialsFromName(data.studentName),
    timeRange,
    activePart,
    activePhase: data.activePhase ?? "part1",
    elapsedSeconds: 0,
    connectionStatus:
      data.status === "active"
        ? "Live · Connected"
        : data.examinerReady
          ? "Session ready"
          : "Waiting to connect",
    criteria: speakingCriteria,
    defaultScores,
    overallBand: data.grade?.overallBand ?? 7.0,
    teacherNotes: data.teacherNotes ?? "",
    status: data.status,
    recordingUrl: data.recordingUrl ?? null,
  };
}
