import { paymentLabel, normalizePaymentMethod } from "@/lib/admin/constants";
import type {
  ContentModule,
  ContentTest,
  Enrollment,
  Examiner,
  LifecycleStatus,
  LiveSessionRow,
  LiveSkill,
  ModuleKey,
  Order,
  OrderStatus,
  TeacherSpeciality,
  TeacherStatus,
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketType,
  TestStatus,
} from "@/lib/admin/types";
import type {
  getAdminDashboard,
  getAdminDisputes,
  getAdminEnrollments,
  getAdminOrders,
  getAdminReports,
  getAdminTeachers,
  getContentTests,
  getLiveSessions,
} from "@/lib/api/admin";

type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
type EnrollmentsResponse = Awaited<ReturnType<typeof getAdminEnrollments>>;
type Teachers = Awaited<ReturnType<typeof getAdminTeachers>>;
type Orders = Awaited<ReturnType<typeof getAdminOrders>>;
type Disputes = Awaited<ReturnType<typeof getAdminDisputes>>;
type Reports = Awaited<ReturnType<typeof getAdminReports>>;
type LiveSessions = Awaited<ReturnType<typeof getLiveSessions>>;
type ContentTests = Awaited<ReturnType<typeof getContentTests>>;

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeLifecycle(value: string): LifecycleStatus {
  const v = value.toLowerCase().replace(/-/g, "_");
  if (v === "awaiting_results" || v === "awaiting") return "awaiting_results";
  if (v === "complete" || v === "completed") return "complete";
  return "in_progress";
}

function normalizeModule(value: string): ModuleKey {
  const v = value.toLowerCase() as ModuleKey;
  if (v === "listening" || v === "reading" || v === "writing" || v === "speaking") {
    return v;
  }
  return "listening";
}

function parseSkillType(skill: string): LiveSkill {
  const s = skill.toLowerCase();
  if (s.includes("speaking")) return "speaking";
  if (s.includes("writing")) return "writing";
  if (s.includes("reading")) return "reading";
  return "listening";
}

function normalizeTeacherStatus(status: string): TeacherStatus {
  const s = status.toLowerCase();
  if (s === "approved" || s === "pending" || s === "suspended") return s;
  return "pending";
}

function normalizeTeacherSpeciality(value: string): TeacherSpeciality {
  const s = value.toLowerCase();
  if (s === "writing" || s === "speaking" || s === "both") return s;
  if (s.includes("speaking")) return "speaking";
  if (s.includes("writing")) return "writing";
  return "both";
}

function normalizeOrderStatus(status: string): OrderStatus {
  const s = status.toLowerCase();
  if (s === "paid" || s === "refunded" || s === "failed" || s === "pending") return s;
  return "pending";
}

function normalizeTicketType(type: string): TicketType {
  const t = type.toLowerCase().replace(/-/g, "_");
  if (
    t === "regrade_request" ||
    t === "teacher_no_show" ||
    t === "technical_issue" ||
    t === "payment_dispute"
  ) {
    return t;
  }
  if (t.includes("regrade")) return "regrade_request";
  if (t.includes("no_show") || t.includes("noshow")) return "teacher_no_show";
  if (t.includes("payment")) return "payment_dispute";
  return "technical_issue";
}

function normalizeTicketPriority(priority: string): TicketPriority {
  const p = priority.toLowerCase();
  if (p === "urgent" || p === "high" || p === "low") return p;
  return "low";
}

function normalizeTicketStatus(status: string): TicketStatus {
  const s = status.toLowerCase().replace(/-/g, "_");
  if (s === "open" || s === "in_progress" || s === "resolved") return s;
  if (s.includes("progress")) return "in_progress";
  return "open";
}

function normalizeTestStatus(status: string): TestStatus {
  const s = status.toLowerCase().replace(/-/g, "_");
  if (s === "under_review") return "review";
  if (s === "published" || s === "draft" || s === "review") return s;
  if (s.includes("publish")) return "published";
  if (s.includes("review")) return "review";
  return "draft";
}

function normalizeContentModule(type: string): ContentModule {
  const t = type.toLowerCase() as ContentModule;
  if (t === "listening" || t === "reading" || t === "writing" || t === "speaking") {
    return t;
  }
  return "listening";
}

export function mapAdminStats(data: Dashboard) {
  return [
    {
      id: "enrollments",
      label: "Total Enrollments",
      value: String(data.kpis.totalEnrollments),
      sub: "All time",
      tone: "navy" as const,
    },
    {
      id: "active",
      label: "Active Exams",
      value: String(data.kpis.activeExams),
      sub: "Live sessions now",
      tone: "emerald" as const,
      live: data.kpis.activeExams > 0,
    },
    {
      id: "revenue",
      label: "Total Revenue",
      value: `$${data.kpis.totalRevenue.toLocaleString()}`,
      sub: "Paid orders",
      tone: "violet" as const,
    },
    {
      id: "tickets",
      label: "Open Tickets",
      value: String(data.kpis.openTickets),
      sub: "Needs attention",
      tone: "amber" as const,
    },
  ];
}

export function mapLiveSessions(sessions: LiveSessions): LiveSessionRow[] {
  return sessions.map((s, i) => {
    const integrityLower = s.integrity.toLowerCase();
    const flagged = integrityLower !== "clear" && integrityLower !== "ok";
    const flags = s.flags ?? (flagged ? 1 : 0);
    return {
      id: s.sessionCode || String(i),
      sessionCode: s.sessionCode,
      studentName: s.studentName,
      country: s.country,
      initials: initials(s.studentName),
      skill: s.skill,
      skillType: parseSkillType(s.skill),
      progress: s.progress,
      timeLeft: s.timeLeft ?? "—",
      examiner: s.examiner ?? "Auto-graded",
      integrity: flagged ? "flagged" : "clear",
      flags,
    };
  });
}

export function mapMonthlyRevenue(
  monthlyRevenue: { month: string; amount: number }[],
) {
  return monthlyRevenue.map(({ month, amount }) => ({ month, amount }));
}

export function mapCompletionRates(
  rates: {
    skill: string;
    pct: number;
    color: "sky" | "emerald" | "violet" | "rose";
  }[],
) {
  return rates.length > 0 ? rates : emptyCompletionRates;
}

export function formatDashboardSyncTime(syncedAt: string): string {
  const synced = new Date(syncedAt);
  if (Number.isNaN(synced.getTime())) return "Just now";
  const diffSec = Math.floor((Date.now() - synced.getTime()) / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return synced.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function mapDashboardMeta(meta: { syncedAt: string; status: string }) {
  const statusLabel =
    meta.status === "operational" ? "Platform operational" : meta.status;
  return {
    status: statusLabel,
    lastSync: formatDashboardSyncTime(meta.syncedAt),
  };
}

export const emptyCompletionRates = [
  { skill: "Listening", pct: 0, color: "sky" as const },
  { skill: "Reading", pct: 0, color: "emerald" as const },
  { skill: "Writing", pct: 0, color: "violet" as const },
  { skill: "Speaking", pct: 0, color: "rose" as const },
];

export function mapEnrollments(data: EnrollmentsResponse) {
  const enrollments: Enrollment[] = data.enrollments.map((e) => ({
    id: e.id,
    enrollmentId: e.enrollmentId,
    studentName: e.studentName,
    initials: initials(e.studentName),
    targetBand: e.targetBand ?? 0,
    country: e.country,
    examDate: formatDate(e.examDate),
    examTime: e.examTime,
    completedModules: e.completedModules.map(normalizeModule),
    speakingExaminer: e.speakingExaminer,
    speakingExaminerInitials: initials(e.speakingExaminer),
    writingExaminer: e.writingExaminer,
    writingExaminerInitials: initials(e.writingExaminer),
    lifecycle: normalizeLifecycle(e.lifecycle),
  }));

  const summary = {
    total: data.summary.total,
    period: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    activeExams: data.summary.activeExams,
    awaitingResults: data.summary.awaitingResults,
    completed: data.summary.completed,
  };

  const total = summary.total || 1;
  const lifecyclePipeline = [
    {
      stage: "Enrolled",
      count: summary.total,
      pct: 100,
      sublabel: `${summary.total} Enrolled`,
      tone: "navy" as const,
    },
    {
      stage: "In Progress",
      count: summary.activeExams,
      pct: Math.round((summary.activeExams / total) * 100),
      sublabel: `${summary.activeExams} In Progress`,
      tone: "sky" as const,
    },
    {
      stage: "Awaiting Results",
      count: summary.awaitingResults,
      pct: Math.round((summary.awaitingResults / total) * 100),
      sublabel: `${summary.awaitingResults} Awaiting Results`,
      tone: "amber" as const,
    },
    {
      stage: "Completed",
      count: summary.completed,
      pct: Math.round((summary.completed / total) * 100),
      sublabel: `${summary.completed} Completed`,
      tone: "emerald" as const,
    },
  ];

  return { enrollments, summary, lifecyclePipeline };
}

export function mapTeachers(teachers: Teachers) {
  const examiners: Examiner[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    initials: initials(t.name),
    email: t.email,
    status: normalizeTeacherStatus(t.status),
    rating: t.rating,
    sessions: t.sessions,
    totalEarned: t.totalEarned,
    joined: "—",
    speciality: normalizeTeacherSpeciality(t.speciality),
  }));

  const summary = {
    total: teachers.length,
    approved: teachers.filter((t) => normalizeTeacherStatus(t.status) === "approved").length,
    pendingReview: teachers.filter((t) => normalizeTeacherStatus(t.status) === "pending").length,
    suspended: teachers.filter((t) => normalizeTeacherStatus(t.status) === "suspended").length,
  };

  return { examiners, summary };
}

export function mapOrders(orders: Orders) {
  const mapped: Order[] = orders.map((o, i) => {
    const method = normalizePaymentMethod(o.paymentMethod);
    return {
      id: o.id || o.orderId || String(i),
      orderId: o.orderId,
      studentName: o.studentName,
      initials: initials(o.studentName),
      enrollmentRef: o.enrollmentRef ?? "—",
      package: o.package,
      paymentMethod: method,
      paymentLabel: paymentLabel(o.paymentMethod),
      date: formatDate(o.createdAt),
      amount: o.amount,
      status: normalizeOrderStatus(o.status),
    };
  });

  const paid = mapped.filter((o) => o.status === "paid");
  const refunded = mapped.filter((o) => o.status === "refunded");
  const failed = mapped.filter((o) => o.status === "failed");

  const summary = {
    revenueCollected: paid.reduce((s, o) => s + o.amount, 0),
    revenueTrend: "—",
    paidOrders: paid.length,
    paidTotal: paid.reduce((s, o) => s + o.amount, 0),
    refundsIssued: refunded.length,
    refundTotal: refunded.reduce((s, o) => s + o.amount, 0),
    failedPayments: failed.length,
  };

  const monthlyOrderTrend =
    mapped.length > 0
      ? [
          {
            month: new Date().toLocaleDateString("en-US", { month: "short" }),
            revenue: summary.revenueCollected,
            orders: mapped.length,
          },
        ]
      : [];

  return { orders: mapped, summary, monthlyOrderTrend };
}

function mapSla(sla: { state: string; progress: number }) {
  const raw = sla.state.toLowerCase();
  const state: "active" | "overdue" | "resolved" =
    raw === "breached"
      ? "overdue"
      : raw === "resolved" || raw === "closed"
        ? "resolved"
        : "active";
  const tone: "amber" | "emerald" | "rose" =
    state === "overdue" ? "rose" : state === "resolved" ? "emerald" : "amber";
  const label =
    state === "overdue"
      ? "Overdue"
      : state === "resolved"
        ? "Resolved"
        : `${Math.max(0, 100 - sla.progress)}% left`;
  return { state, label, progress: sla.progress, tone };
}

export function mapDisputes(disputes: Disputes) {
  const tickets: Ticket[] = disputes.map((d, i) => ({
    id: d.id || d.ticketId || String(i),
    ticketId: d.ticketId,
    date: formatDate(d.createdAt),
    studentName: d.subject.split("·")[0]?.trim() || d.subject,
    initials: initials(d.subject.split("·")[0]?.trim() || "ST"),
    country: "—",
    enrollmentRef: "—",
    type: normalizeTicketType(d.type),
    preview: d.subject,
    priority: normalizeTicketPriority(d.priority),
    sla: mapSla(d.sla),
    assignee: d.assignee ?? null,
    status: normalizeTicketStatus(d.status),
  }));

  const open = tickets.filter((t) => t.status === "open");
  const inProgress = tickets.filter((t) => t.status === "in_progress");
  const resolved = tickets.filter((t) => t.status === "resolved");
  const urgentOpen = open.filter((t) => t.priority === "urgent").length;
  const slaBreached = tickets.filter((t) => t.sla.state === "overdue").length;

  const summary = {
    openTickets: open.length,
    urgentOpen,
    inProgress: inProgress.length,
    resolvedThisMonth: resolved.length,
    slaBreached,
  };

  const typeCounts = new Map<string, number>();
  for (const t of tickets) {
    const label =
      t.type === "regrade_request"
        ? "Regrade Request"
        : t.type === "teacher_no_show"
          ? "Teacher No-show"
          : t.type === "payment_dispute"
            ? "Payment Dispute"
            : "Technical Issue";
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  }
  const max = Math.max(1, ...typeCounts.values());
  const colors: Record<string, string> = {
    "Regrade Request": "bg-violet-500",
    "Teacher No-show": "bg-rose-500",
    "Payment Dispute": "bg-amber-500",
    "Technical Issue": "bg-sky-500",
  };
  const ticketsByType = Array.from(typeCounts.entries()).map(([type, count]) => ({
    type,
    count,
    color: colors[type] ?? "bg-slate-400",
    max,
  }));

  return { tickets, summary, ticketsByType };
}

export function mapReports(data: Reports) {
  const summary = {
    revenueMtd: data.revenue.total,
    revenueTrend: "—",
    examsDelivered: data.revenue.orderCount,
    examsPeriod: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    examsTrend: "—",
    avgBandScore: 0,
    avgBandSub: "Not available yet",
    avgBandTrend: "—",
    satisfaction: 0,
    satisfactionSub: "No ratings yet",
    satisfactionTrend: "—",
  };

  const enrollmentFunnel = data.funnel.map((f) => ({
    month: f.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    enrolled: f.count,
    completed:
      f.status.toLowerCase().includes("complete") ? f.count : 0,
  }));

  const teacherLeaderboard = data.teacherLeaderboard.map((t, i) => ({
    rank: i + 1,
    name: t.name,
    initials: initials(t.name),
    status: "Active examiner",
    speciality: "Examiner",
    specialityTone: (i % 2 === 0 ? "rose" : "violet") as "rose" | "violet",
    sessions: t.sessions,
    rating: t.rating ?? 0,
    totalEarned: t.earned,
    mom: 0,
  }));

  const revenueExamVolume =
    data.revenue.total > 0
      ? [
          {
            month: new Date().toLocaleDateString("en-US", { month: "short" }),
            revenue: data.revenue.total,
            exams: data.revenue.orderCount,
          },
        ]
      : [];

  return {
    summary,
    enrollmentFunnel,
    teacherLeaderboard,
    revenueExamVolume,
    bandScoreDistribution: [] as { score: string; count: number; highlight: boolean }[],
    modulePerformance: [] as {
      module: ModuleKey;
      label: string;
      exams: number;
      avgBand: number;
      passRate: number;
      mom: number;
    }[],
  };
}

export function mapLiveMonitorMeta(sessions: LiveSessionRow[]) {
  const flagged = sessions.filter((s) => s.integrity === "flagged");
  const withExaminer = sessions.filter(
    (s) => s.examiner && !s.examiner.toLowerCase().includes("auto"),
  ).length;

  return {
    sessionsRunning: sessions.length,
    flaggedCount: flagged.length,
    avgTimeRemaining: "—",
    withExaminer,
    flaggedStudents: flagged.map((s) => s.studentName),
  };
}

export function mapMonitorSummary(meta: ReturnType<typeof mapLiveMonitorMeta>) {
  return [
    {
      id: "active",
      label: "Active Sessions",
      value: String(meta.sessionsRunning),
      icon: "activity" as const,
      tone: "sky" as const,
    },
    {
      id: "flagged",
      label: "Flagged",
      value: String(meta.flaggedCount),
      icon: "alert" as const,
      tone: "rose" as const,
    },
    {
      id: "time",
      label: "Avg Time Remaining",
      value: meta.avgTimeRemaining,
      icon: "clock" as const,
      tone: "amber" as const,
    },
    {
      id: "examiner",
      label: "With Examiner",
      value: String(meta.withExaminer),
      icon: "user" as const,
      tone: "violet" as const,
    },
  ];
}

export function mapContentTests(tests: ContentTests) {
  const list = Array.isArray(tests) ? tests : [];
  const mapped: ContentTest[] = list.map((t) => ({
    id: t.id,
    name: t.title || t.code,
    module: normalizeContentModule(t.type),
    status: normalizeTestStatus(t.status),
    questions: t.questionCount ?? 0,
    mediaCount: t.mediaCount ?? 0,
    lastUpdated: formatShortDate(t.updatedAt),
    author: "Admin",
  }));

  const counts = {
    listening: mapped.filter((t) => t.module === "listening").length,
    reading: mapped.filter((t) => t.module === "reading").length,
    writing: mapped.filter((t) => t.module === "writing").length,
    speaking: mapped.filter((t) => t.module === "speaking").length,
  };

  const moduleTabs = [
    { id: "listening" as const, label: "Listening", count: counts.listening },
    { id: "reading" as const, label: "Reading", count: counts.reading },
    { id: "writing" as const, label: "Writing", count: counts.writing },
    { id: "speaking" as const, label: "Speaking", count: counts.speaking },
  ];

  const summary = {
    total: mapped.length,
    published: mapped.filter((t) => t.status === "published").length,
    underReview: mapped.filter((t) => t.status === "review").length,
    drafts: mapped.filter((t) => t.status === "draft").length,
  };

  return { tests: mapped, moduleTabs, summary };
}

const defaultExamTimerValues: Record<string, number> = {
  listening: 40,
  reading: 60,
  writing: 60,
  speaking: 20,
  break: 10,
  checkIn: 30,
  lateJoin: 15,
};

const defaultNotificationValues: Record<string, boolean> = {
  booking: true,
  reminder24: true,
  reminder1: true,
  results: true,
  dispute: false,
  assigned: true,
  cancelled: true,
  payout: true,
  disputeRaised: true,
  newDispute: true,
  slaBreach: true,
  digest: false,
  fraud: true,
};

const defaultIntegrationValues: Record<string, boolean> = {
  stripeConfigured: false,
  smtpConfigured: false,
  sendgridConfigured: false,
  livekitConfigured: false,
  livekitRecordingEnabled: false,
  slackConfigured: false,
  mediaStorageConfigured: false,
  s3Configured: false,
};

export function mapAdminSettings(raw: Record<string, unknown>) {
  const general = (raw.general ?? {}) as Record<string, unknown>;
  const commission = (raw.commission ?? {}) as Record<string, unknown>;
  const examTimersRaw = (raw.exam_timers ?? raw.examTimers ?? {}) as Record<
    string,
    unknown
  >;
  const notificationsRaw = (raw.notifications ?? {}) as Record<string, unknown>;
  const integrationsRaw = (raw.integrations ?? {}) as Record<string, unknown>;

  const examTimers = Object.fromEntries(
    Object.entries(defaultExamTimerValues).map(([key, fallback]) => [
      key,
      Number(examTimersRaw[key] ?? fallback),
    ]),
  );

  const notifications = Object.fromEntries(
    Object.entries(defaultNotificationValues).map(([key, fallback]) => [
      key,
      notificationsRaw[key] !== undefined
        ? Boolean(notificationsRaw[key])
        : fallback,
    ]),
  );

  const integrations = Object.fromEntries(
    Object.entries(defaultIntegrationValues).map(([key, fallback]) => [
      key,
      integrationsRaw[key] !== undefined
        ? Boolean(integrationsRaw[key])
        : fallback,
    ]),
  );

  return {
    generalSettings: {
      platformName: String(general.platformName ?? "IELTS Mock Platform"),
      supportEmail: String(general.supportEmail ?? "support@itestu.uz"),
      adminContact: String(general.adminContact ?? "admin@itestu.uz"),
      platformUrl: String(general.platformUrl ?? "https://itestu.uz"),
      timezone: String(general.timezone ?? "UTC+0 (London)"),
      defaultLanguage: String(general.defaultLanguage ?? "English (en-GB)"),
    },
    commissionSettings: {
      platformCommission: Number(
        commission.platformCommission ?? commission.platformRate ?? 25,
      ),
      speakingRate: Number(
        commission.speakingRate ?? commission.speakingFee ?? 25,
      ),
      writingRate: Number(
        commission.writingRate ?? commission.writingFee ?? 35,
      ),
      disputeRefundCap: Number(commission.disputeRefundCap ?? 100),
      payoutSchedule: String(commission.payoutSchedule ?? "weekly") as
        | "weekly"
        | "biweekly"
        | "monthly",
    },
    examTimers,
    bandTable: (raw.band_table ?? raw.bandTable ?? {}) as Record<string, unknown>,
    notifications,
    integrations,
    lastSaved: raw.lastSaved
      ? formatDate(String(raw.lastSaved))
      : "Not saved yet",
  };
}
