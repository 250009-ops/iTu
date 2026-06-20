import type { getSpeakingSession } from "@/lib/api/grading";
import type {
  getTeacherAvailability,
  getTeacherDashboard,
  getTeacherEarnings,
  getTeacherProfile,
  getTeacherSpeakingSessions,
  SpeakingSessionListItem,
} from "@/lib/api/teachers";
import type { getSpeakingQueue, getWritingQueue } from "@/lib/api/grading";
import {
  fromSpeakingCriteriaPayload,
  speakingCriteria,
  type ScoringCriterion,
  type SpeakingPart,
} from "@/lib/speaking/scoring";

type Dashboard = Awaited<ReturnType<typeof getTeacherDashboard>>;
type WritingQueue = Awaited<ReturnType<typeof getWritingQueue>>;
type SpeakingQueue = Awaited<ReturnType<typeof getSpeakingQueue>>;
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

export function getWeekMonday(date: Date) {
  return getMonday(date);
}

export function avatarColorFromName(name: string) {
  const palette = [
    { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
    { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
    { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
    { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
    { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export type ScheduleBlock = {
  id: string;
  status: SlotStatus;
  startMinutes: number;
  endMinutes: number;
  startLabel: string;
  endLabel: string;
  slotIds: string[];
  studentName: string | null;
  studentInitials: string | null;
};

export type AvailabilityDay = {
  key: DayKey;
  dayOfWeek: number;
  label: string;
  date: string;
  monthDay: string;
  isOff: boolean;
  blocks: ScheduleBlock[];
};

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
      id: "speaking",
      label: "Pending Speaking",
      value: String(data.stats.speakingQueue ?? 0),
      sub: "Awaiting grading",
      trend: null,
      tone: "rose" as const,
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

export type SpeakingSessionUiStatus =
  | "upcoming"
  | "live"
  | "awaiting_grade"
  | "graded";

export type MappedSpeakingSessionItem = {
  id: string;
  studentName: string;
  initials: string;
  colors: ReturnType<typeof avatarColorFromName>;
  timeRange: string;
  dateLabel: string;
  dateTimeLabel: string;
  sessionSubtitle: string;
  uiStatus: SpeakingSessionUiStatus;
  overallBand: number | null;
  criteria: { fc: number; lex: number; gra: number; pr: number } | null;
  recordingUrl: string | null;
  scheduledAt: string | null;
};

function formatSpeakingTimeRange(
  scheduledAt: string | null,
  endsAt: string | null,
): string {
  if (!scheduledAt) return "TBD";
  const start = new Date(scheduledAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 20 * 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function examTypeLabel(examType: string): string {
  if (examType === "general_training" || examType === "general") {
    return "IELTS General Training Speaking";
  }
  return "IELTS Academic Speaking";
}

function mapSpeakingCriteriaScores(
  criteriaScores: Record<string, number> | null | undefined,
): { fc: number; lex: number; gra: number; pr: number } | null {
  if (!criteriaScores) return null;
  const fc =
    criteriaScores.fluencyCoherence ?? criteriaScores.fluency ?? null;
  const lex =
    criteriaScores.lexicalResource ?? criteriaScores.lexical ?? null;
  const gra = criteriaScores.grammar ?? null;
  const pr = criteriaScores.pronunciation ?? null;
  if (
    typeof fc !== "number" ||
    typeof lex !== "number" ||
    typeof gra !== "number" ||
    typeof pr !== "number"
  ) {
    return null;
  }
  return { fc, lex, gra, pr };
}

function mapSpeakingSessionItem(
  item: SpeakingSessionListItem,
): MappedSpeakingSessionItem {
  const scheduledAt = item.scheduledAt;
  const dateLabel = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
  const timeOnly = scheduledAt
    ? new Date(scheduledAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return {
    id: item.id,
    studentName: item.studentName,
    initials: initialsFromName(item.studentName),
    colors: avatarColorFromName(item.studentName),
    timeRange: formatSpeakingTimeRange(item.scheduledAt, item.endsAt),
    dateLabel,
    dateTimeLabel: `${dateLabel} · ${formatSpeakingTimeRange(item.scheduledAt, item.endsAt)}`,
    sessionSubtitle: `${formatSpeakingTimeRange(item.scheduledAt, item.endsAt)} · ${examTypeLabel(item.examType)}`,
    uiStatus: item.uiStatus,
    overallBand: item.grade?.overallBand ?? null,
    criteria: mapSpeakingCriteriaScores(item.grade?.criteriaScores),
    recordingUrl: item.recordingUrl,
    scheduledAt: item.scheduledAt,
  };
}

export function mapTeacherSpeakingSessions(
  data: Awaited<ReturnType<typeof getTeacherSpeakingSessions>>,
) {
  return {
    today: data.today.map(mapSpeakingSessionItem),
    upcoming: data.upcoming.map(mapSpeakingSessionItem),
    completed: data.completed.map(mapSpeakingSessionItem),
    counts: data.counts,
    nextSession: data.nextSession
      ? mapSpeakingSessionItem(data.nextSession)
      : null,
    minutesUntilNext: data.minutesUntilNext,
  };
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

export function mapSpeakingQueue(queue: SpeakingQueue) {
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
      status: item.status as GradingStatus,
      scheduledAt: item.scheduledAt,
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

export function mapTeacherAvailability(data: Availability, weekOffset = 0) {
  const weekStart = data.weekStart
    ? new Date(data.weekStart)
    : getMonday(new Date());
  if (!data.weekStart) {
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  }

  const activeDays = new Set(data.weekly.map((w) => w.dayOfWeek));
  const daysOff = 7 - activeDays.size;

  const days: AvailabilityDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dayOfWeek = d.getDay();
    const key = DAY_KEYS[dayOfWeek] as DayKey;
    const isOff = !activeDays.has(dayOfWeek);

    const daySlots = data.slots
      .filter((slot) => {
        const startsAt = new Date(slot.startsAt);
        return (
          startsAt.getFullYear() === d.getFullYear() &&
          startsAt.getMonth() === d.getMonth() &&
          startsAt.getDate() === d.getDate()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );

    const blocks = mergeDaySlots(daySlots);

    return {
      key,
      dayOfWeek,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: String(d.getDate()),
      monthDay: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isOff,
      blocks,
    };
  });

  const weekLabelEnd = new Date(weekStart);
  weekLabelEnd.setDate(weekStart.getDate() + 6);

  const open = data.slots.filter((s) => s.status === "available").length;
  const booked = data.slots.filter((s) => s.status === "booked").length;
  const blocked = data.slots.filter((s) => s.status === "blocked").length;

  return {
    weekStart,
    weekOffset,
    label: `${weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${weekLabelEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`,
    isCurrentWeek: weekOffset === 0,
    stats: {
      open,
      booked,
      blocked,
      daysOff,
      sessionDuration: `${data.slotDuration}-minute speaking sessions`,
    },
    slotDuration: data.slotDuration,
    bufferMinutes: data.bufferMinutes,
    days,
    weekly: data.weekly,
    upcoming: data.upcoming.map((item) => {
      const startsAt = new Date(item.startsAt);
      return {
        id: item.id,
        studentName: item.studentName,
        initials: initialsFromName(item.studentName),
        label: `${startsAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} · ${startsAt.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        colors: avatarColorFromName(item.studentName),
      };
    }),
    gridStartHour: 7,
    gridEndHour: 18,
  };
}

function mergeDaySlots(
  slots: Availability["slots"],
): ScheduleBlock[] {
  if (slots.length === 0) return [];

  const blocks: ScheduleBlock[] = [];
  let current: ScheduleBlock | null = null;

  for (const slot of slots) {
    const startsAt = new Date(slot.startsAt);
    const endsAt = new Date(slot.endsAt);
    const status = mapSlotStatus(slot.status);
    const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
    const endMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();

    if (
      !current ||
      current.status !== status ||
      startMinutes > current.endMinutes + 1 ||
      (status === "booked" &&
        current.studentName !== (slot.studentName ?? null))
    ) {
      if (current) blocks.push(current);
      current = {
        id: slot.id,
        status,
        startMinutes,
        endMinutes,
        startLabel: formatTime24(startsAt),
        endLabel: formatTime24(endsAt),
        slotIds: [slot.id],
        studentName: slot.studentName,
        studentInitials: slot.studentName
          ? initialsFromName(slot.studentName)
          : null,
      };
    } else {
      current.endMinutes = endMinutes;
      current.endLabel = formatTime24(endsAt);
      current.slotIds.push(slot.id);
    }
  }

  if (current) blocks.push(current);
  return blocks;
}

function formatTime24(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
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
    Object.assign(defaultScores, fromSpeakingCriteriaPayload(data.grade.criteriaScores));
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
    graded: Boolean(data.grade),
    gradedBand: data.grade?.overallBand ?? null,
    teacherNotes: data.teacherNotes ?? "",
    status: data.status,
    recordingUrl: data.recordingUrl ?? null,
  };
}
