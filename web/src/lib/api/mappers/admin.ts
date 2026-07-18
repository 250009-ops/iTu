import { paymentLabel, normalizePaymentMethod } from "@/lib/admin/constants";
import { mergeBandTiers, type BandTiers } from "@/lib/examiner-rate-tiers";
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
  Student,
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
  getAdminStudents,
  getAdminTeachers,
  getContentTests,
  getLiveSessions,
} from "@/lib/api/admin";
import { formatPrice } from "@/lib/format-price";

type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
type EnrollmentsResponse = Awaited<ReturnType<typeof getAdminEnrollments>>;
type Teachers = Awaited<ReturnType<typeof getAdminTeachers>>;
type Students = Awaited<ReturnType<typeof getAdminStudents>>;
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
  if (v === "missed") return "missed";
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
  if (
    s === "paid" ||
    s === "complimentary" ||
    s === "refunded" ||
    s === "failed" ||
    s === "pending"
  ) {
    return s;
  }
  return "pending";
}

/** Paid checkout only — free admin grants / reappointments are not revenue. */
function isPaidCheckoutOrder(order: {
  status: OrderStatus;
  paymentMethod: string;
}): boolean {
  return (
    order.status === "paid" &&
    !String(order.paymentMethod).toLowerCase().includes("complimentary")
  );
}

function normalizeTicketType(type: string): TicketType {
  const t = type.toLowerCase().replace(/-/g, "_");
  if (
    t === "regrade_request" ||
    t === "teacher_no_show" ||
    t === "technical_issue" ||
    t === "payment_dispute" ||
    t === "student_conduct"
  ) {
    return t;
  }
  if (t.includes("regrade")) return "regrade_request";
  if (t.includes("conduct") || t.includes("misbehav")) return "student_conduct";
  if (t.includes("no_show") || t.includes("noshow")) return "teacher_no_show";
  if (t.includes("payment")) return "payment_dispute";
  return "technical_issue";
}

function normalizeTicketPriority(priority: string): TicketPriority {
  const p = priority.toLowerCase();
  if (p === "urgent" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

function normalizeTicketStatus(status: string): TicketStatus {
  const s = status.toLowerCase().replace(/-/g, "_");
  if (s === "open" || s === "in_progress" || s === "resolved") return s;
  if (s.includes("progress")) return "in_progress";
  return "open";
}

function normalizeTestStatus(status: string): TestStatus {
  const s = status.toLowerCase().replace(/-/g, "_");
  if (s === "archived") return "archived";
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
      value: formatPrice(data.kpis.totalRevenue),
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
  const syncedAt = Date.now();
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
      remainingSec: s.remainingSec,
      syncedAt,
      examiner: s.examiner ?? "Auto-graded",
      integrity: flagged ? "flagged" : "clear",
      flags,
      suspended: s.suspended ?? false,
      suspendReason: s.suspendReason ?? null,
      suspendedAt: s.suspendedAt ?? null,
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
    examTime: e.examTime ?? "Flexible",
    adminGranted: Boolean(e.adminGranted),
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
    applicationRejected: t.applicationRejected,
    rating: t.rating,
    sessions: t.sessions,
    totalEarned: t.totalEarned,
    joined: t.createdAt ? formatDate(t.createdAt) : "—",
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

export function mapStudents(students: Students) {
  const rows: Student[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    initials: initials(s.name),
    email: s.email,
    targetBand: s.targetBand,
    examType:
      s.examType.toLowerCase().includes("general") ? "general_training" : "academic",
    country: s.country,
    emailVerified: s.emailVerified,
    enrollments: s.enrollments,
    joined: s.createdAt ? formatDate(s.createdAt) : "—",
    activeAdminGrant: s.activeAdminGrant ?? null,
  }));

  const summary = {
    total: rows.length,
    verified: rows.filter((s) => s.emailVerified).length,
    enrolled: rows.filter((s) => s.enrollments > 0).length,
    awaitingFirstMock: rows.filter((s) => s.enrollments === 0).length,
  };

  return { students: rows, summary };
}

function formatRevenueTrendFromMonthly(
  monthly: { amount: number }[],
): string {
  if (monthly.length < 2) return "—";
  const prev = monthly[monthly.length - 2]?.amount ?? 0;
  const curr = monthly[monthly.length - 1]?.amount ?? 0;
  if (prev === 0 && curr === 0) return "—";
  if (prev === 0) return "+100%";
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return "0%";
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function mapOrders(payload: Orders) {
  const orders = payload.orders ?? [];
  const mapped: Order[] = orders.map((o, i) => {
    const method = normalizePaymentMethod(o.paymentMethod);
    const rawStatus = normalizeOrderStatus(o.status);
    // Free grants stay PAID in DB for fulfillment, but admin UI must not treat them as paid.
    const status: OrderStatus =
      rawStatus === "paid" && method === "complimentary"
        ? "complimentary"
        : rawStatus;
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
      status,
    };
  });

  const monthlyRevenue = payload.monthlyRevenue ?? [];
  const fallbackTrend = formatRevenueTrendFromMonthly(monthlyRevenue);
  const paidCheckout = mapped.filter(isPaidCheckoutOrder);

  const summary = payload.summary ?? {
    revenueCollected: paidCheckout.reduce((s, o) => s + o.amount, 0),
    revenueTrend: fallbackTrend,
    paidOrders: paidCheckout.length,
    paidTotal: paidCheckout.reduce((s, o) => s + o.amount, 0),
    refundsIssued: mapped.filter((o) => o.status === "refunded").length,
    refundTotal: mapped
      .filter((o) => o.status === "refunded")
      .reduce((s, o) => s + o.amount, 0),
    failedPayments: mapped.filter((o) => o.status === "failed").length,
  };

  const monthlyOrderTrend = monthlyRevenue.map((row) => ({
    month: row.month,
    revenue: row.amount,
    orders: row.orderCount ?? 0,
  }));

  return {
    orders: mapped,
    summary: {
      ...summary,
      revenueTrend: summary.revenueTrend ?? fallbackTrend,
    },
    monthlyOrderTrend,
  };
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

function mapDisputeRecord(d: Disputes[number], indexFallback: string): Ticket {
  const roleRaw = d.reporter?.role?.toLowerCase() ?? "";
  const reporterRole: Ticket["reporterRole"] =
    roleRaw === "student" ||
    roleRaw === "teacher" ||
    roleRaw === "admin" ||
    roleRaw === "institution"
      ? roleRaw
      : "unknown";
  const reporterName = d.reporter?.name?.trim() || "Unknown reporter";
  const related =
    d.relatedRef?.trim() ||
    d.relatedStudent?.trim() ||
    (d.enrollmentRef && d.enrollmentRef !== "—" ? d.enrollmentRef : null) ||
    null;
  const message =
    d.message?.trim() ||
    (d.description?.startsWith("Related:")
      ? d.description.split("\n\n").slice(1).join("\n\n").trim()
      : d.description?.trim()) ||
    "";

  return {
    id: d.id || d.ticketId || indexFallback,
    ticketId: d.ticketId,
    date: formatDate(d.createdAt),
    reporterName,
    reporterRole,
    initials: initials(reporterName),
    relatedRef: related,
    relatedStudent: d.relatedStudent?.trim() || null,
    enrollmentId: d.enrollmentId ?? null,
    enrollmentRef: d.enrollmentRef ?? "—",
    enrollmentAdminGranted: d.enrollmentAdminGranted ?? false,
    sessionCode: d.sessionCode ?? null,
    orderId: d.orderId ?? null,
    orderCode: d.orderCode ?? null,
    orderStatus: d.orderStatus ?? null,
    orderAmount: d.orderAmount ?? null,
    type: normalizeTicketType(d.type),
    preview: d.subject,
    description: message,
    priority: normalizeTicketPriority(d.priority),
    sla: mapSla(d.sla),
    status: normalizeTicketStatus(d.status),
  };
}

export function mapSingleDispute(d: Disputes[number]): Ticket {
  return mapDisputeRecord(d, d.id ?? "0");
}

export function mapDisputes(disputes: Disputes) {
  const tickets: Ticket[] = disputes.map((d, i) =>
    mapDisputeRecord(d, String(i)),
  );

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
            : t.type === "student_conduct"
              ? "Student Conduct"
              : "Technical Issue";
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  }
  const max = Math.max(1, ...typeCounts.values());
  const colors: Record<string, string> = {
    "Regrade Request": "bg-violet-500",
    "Teacher No-show": "bg-rose-500",
    "Payment Dispute": "bg-amber-500",
    "Student Conduct": "bg-orange-500",
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

function teacherStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "Active examiner";
  if (s === "pending") return "Pending approval";
  if (s === "suspended") return "Suspended";
  return status;
}

function teacherSpecialityLabel(speciality: string): string {
  const s = speciality.toLowerCase();
  if (s === "writing") return "Writing";
  if (s === "speaking") return "Speaking";
  if (s === "both") return "Both";
  return speciality;
}

function teacherSpecialityTone(
  speciality: string,
): "rose" | "violet" | "sky" {
  const s = speciality.toLowerCase();
  if (s === "writing") return "violet";
  if (s === "speaking") return "rose";
  return "sky";
}

export function mapReports(data: Reports) {
  const summary = {
    revenueLabel: data.period.revenueLabel,
    revenueMtd: data.summary.revenueTotal,
    revenueTrend: data.summary.revenueTrend,
    revenueTrendSub: data.summary.revenueTrendSub,
    examsDelivered: data.summary.examsDelivered,
    examsPeriod: data.period.examsPeriod,
    examsTrend: data.summary.examsTrend,
    avgBandScore: data.summary.avgBandScore ?? 0,
    avgBandSub:
      data.summary.avgBandScore != null
        ? `Released results in ${data.period.label}`
        : "No released results in period",
    avgBandTrend: data.summary.avgBandTrend,
    satisfaction: data.summary.satisfaction ?? 0,
    satisfactionSub: data.summary.satisfactionSub,
    satisfactionTrend: data.summary.satisfactionTrend,
  };

  const teacherLeaderboard = data.teacherLeaderboard.map((t, i) => ({
    rank: i + 1,
    id: t.id,
    name: t.name,
    initials: initials(t.name),
    status: teacherStatusLabel(t.status),
    speciality: teacherSpecialityLabel(t.speciality),
    specialityTone: teacherSpecialityTone(t.speciality),
    sessions: t.sessions,
    rating: t.rating ?? 0,
    totalEarned: t.earned,
    mom: t.mom,
  }));

  return {
    periodLabel: data.period.label,
    summary,
    enrollmentFunnel: data.enrollmentFunnel,
    teacherLeaderboard,
    revenueExamVolume: data.monthlyRevenue,
    bandScoreDistribution: data.bandDistribution,
    modulePerformance: data.modulePerformance.map((row) => ({
      module: normalizeModule(row.module),
      label: row.label,
      exams: row.exams,
      avgBand: row.avgBand,
      passRate: row.passRate,
      mom: row.mom,
    })),
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
    author: t.authorName ?? "Admin",
    linkedPackages: t.linkedPackages ?? 0,
    activePackageLinks: t.activePackageLinks ?? 0,
    assignedMockLabel: t.assignedMockLabel ?? null,
    assignedMockLabels: t.assignedMockLabels ?? [],
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
    archived: mapped.filter((t) => t.status === "archived").length,
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
  results: true,
  assigned: true,
  payout: true,
  newDispute: true,
  slaBreach: true,
};

const defaultIntegrationValues: Record<string, boolean> = {
  uzumCheckoutConfigured: false,
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
      platformName: "iTestU",
      supportEmail: String(general.supportEmail ?? "support@itestu.uz"),
      adminContact: String(general.adminContact ?? "admin@itestu.uz"),
      platformUrl: String(general.platformUrl ?? "https://www.itestu.uz"),
      timezone: String(general.timezone ?? "Asia/Tashkent"),
      defaultLanguage: String(general.defaultLanguage ?? "English (en-GB)"),
    },
    commissionSettings: {
      bandTiers: mergeBandTiers(
        (commission.bandTiers as Partial<BandTiers> | undefined) ?? null,
      ),
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
