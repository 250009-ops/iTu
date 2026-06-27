import type {
  ContentModule,
  LifecycleStatus,
  ModuleKey,
  PaymentMethod,
  SettingsTab,
  TeacherStatus,
  TicketType,
} from "./types";

export const settingsTabs: {
  id: SettingsTab;
  label: string;
  description: string;
}[] = [
  { id: "general", label: "General", description: "Platform identity & policies" },
  { id: "exam_timers", label: "Exam Timers", description: "Module duration controls" },
  { id: "commission", label: "Commission", description: "Rates & payout rules" },
  { id: "band_table", label: "Band Table", description: "Raw score conversion" },
  { id: "notifications", label: "Notifications", description: "Alerts & email triggers" },
  { id: "integrations", label: "Integrations", description: "API keys & webhooks" },
];

export const systemHealth = [
  { service: "API", status: "operational" as const },
  { service: "Payments", status: "operational" as const },
  { service: "Email", status: "degraded" as const },
];

export const allModules: ModuleKey[] = [
  "listening",
  "reading",
  "writing",
  "speaking",
];

export const moduleBadges: Record<
  ModuleKey,
  { label: string; className: string }
> = {
  listening: { label: "L", className: "bg-sky-500 text-white" },
  reading: { label: "R", className: "bg-emerald-500 text-white" },
  writing: { label: "W", className: "bg-violet-500 text-white" },
  speaking: { label: "S", className: "bg-rose-500 text-white" },
};

export const lifecycleFilterOptions: {
  value: "all" | LifecycleStatus;
  label: string;
}[] = [
  { value: "all", label: "All Status" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_results", label: "Awaiting Results" },
  { value: "complete", label: "Complete" },
];

export const teacherStatusFilterOptions: {
  value: "all" | TeacherStatus;
  label: string;
}[] = [
  { value: "all", label: "All Status" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];

export const orderStatusFilterOptions = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
] as const;

export const disputeStatusFilterOptions = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
] as const;

export const disputePriorityFilterOptions = [
  { value: "all", label: "All Priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
] as const;

export const ticketTypeMeta: Record<
  TicketType,
  { label: string; iconTone: string; pill: string }
> = {
  regrade_request: {
    label: "Regrade Request",
    iconTone: "text-violet-600 bg-violet-100",
    pill: "text-violet-700",
  },
  teacher_no_show: {
    label: "Teacher No-show",
    iconTone: "text-rose-600 bg-rose-100",
    pill: "text-rose-700",
  },
  technical_issue: {
    label: "Technical Issue",
    iconTone: "text-sky-600 bg-sky-100",
    pill: "text-sky-700",
  },
  payment_dispute: {
    label: "Payment Dispute",
    iconTone: "text-amber-600 bg-amber-100",
    pill: "text-amber-700",
  },
};

export const moduleBadgeStyles: Record<ModuleKey, string> = {
  listening: "bg-sky-50 text-sky-700",
  reading: "bg-emerald-50 text-emerald-700",
  writing: "bg-violet-50 text-violet-700",
  speaking: "bg-rose-50 text-rose-700",
};

export const specialityPillStyles = {
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
};

export const contentModuleLabels: Record<ContentModule, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export const listeningParts = ["Part 1", "Part 2", "Part 3", "Part 4"] as const;

export const questionTypes = [
  "Note Completion",
  "Multiple Choice",
  "Matching",
  "Form Completion",
  "Map Labelling",
] as const;

export const defaultExamPolicies = [
  {
    id: "autoRelease",
    label: "Auto-release results after speaking grade",
    hint: "Students see scores as soon as all modules are graded — no manual publish required.",
    defaultOn: true,
  },
  {
    id: "retake72h",
    label: "Allow retake within 72 hours",
    hint: "Students can rebook without waiting 3 days; use with caution.",
    defaultOn: false,
  },
  {
    id: "photoId",
    label: "Require photo ID verification at check-in",
    hint: "Examiner must confirm student identity before session starts.",
    defaultOn: true,
  },
  {
    id: "lateJoin",
    label: "Enforce late-join cutoff (15 min)",
    hint: "Students who connect more than 15 min late are marked absent.",
    defaultOn: true,
  },
];

export const defaultExamTimers = [
  {
    id: "listening",
    label: "Listening Module",
    hint: "Includes audio playback time",
    minutes: 40,
    color: "bg-sky-500",
    icon: "headphones" as const,
  },
  {
    id: "reading",
    label: "Reading Module",
    hint: "Academic or General Training",
    minutes: 60,
    color: "bg-emerald-500",
    icon: "book" as const,
  },
  {
    id: "writing",
    label: "Writing Module",
    hint: "Tasks 1 + 2 combined",
    minutes: 60,
    color: "bg-violet-500",
    icon: "pen" as const,
  },
  {
    id: "speaking",
    label: "Speaking Slot",
    hint: "Per candidate; excludes setup",
    minutes: 20,
    color: "bg-rose-500",
    icon: "mic" as const,
  },
  {
    id: "break",
    label: "Break Duration",
    hint: "After Reading, before Writing",
    minutes: 10,
    color: "bg-amber-400",
    icon: "clock" as const,
  },
  {
    id: "checkIn",
    label: "Check-in Window",
    hint: "Opens N minutes before exam start",
    minutes: 30,
    color: "bg-slate-400",
    icon: "check" as const,
  },
  {
    id: "lateJoin",
    label: "Late-join Cutoff",
    hint: "Student marked absent after this",
    minutes: 15,
    color: "bg-rose-600",
    icon: "alert" as const,
  },
];

export const defaultBandConversionTable = [
  { band: "9.0", listening: "39–40", reading: "40", weight: 100 },
  { band: "8.5", listening: "37–38", reading: "37–39", weight: 94 },
  { band: "8.0", listening: "35–36", reading: "35–36", weight: 88 },
  { band: "7.5", listening: "33–34", reading: "33–34", weight: 82 },
  { band: "7.0", listening: "30–32", reading: "30–32", weight: 76 },
  { band: "6.5", listening: "27–29", reading: "27–29", weight: 70 },
  { band: "6.0", listening: "23–26", reading: "23–26", weight: 64 },
  { band: "5.5", listening: "19–22", reading: "19–22", weight: 58 },
  { band: "5.0", listening: "15–18", reading: "15–18", weight: 52 },
  { band: "4.5", listening: "12–14", reading: "12–14", weight: 46 },
];

export const defaultNotificationGroups = [
  {
    id: "student",
    label: "Student Notifications",
    tone: "sky" as const,
    items: [
      { id: "booking", label: "Booking confirmation email", hint: "Sent immediately after payment completes.", defaultOn: true },
      { id: "reminder24", label: "Exam reminder (24 hrs before)", hint: "Includes session link and ID check reminder.", defaultOn: true },
      { id: "reminder1", label: "Exam reminder (1 hr before)", hint: "Final reminder with direct join link.", defaultOn: true },
      { id: "results", label: "Results published notification", hint: "Email + in-app when all modules are graded.", defaultOn: true },
      { id: "dispute", label: "Dispute status updates", hint: "Updates when ticket status changes.", defaultOn: false },
    ],
  },
  {
    id: "teacher",
    label: "Teacher Notifications",
    tone: "emerald" as const,
    items: [
      { id: "assigned", label: "New session assigned", hint: "Sent when admin assigns a student session.", defaultOn: true },
      { id: "cancelled", label: "Session cancelled by student", hint: "With reason and cancellation timestamp.", defaultOn: true },
      { id: "payout", label: "Payout processed", hint: "Weekly payout confirmation with breakdown.", defaultOn: true },
      { id: "disputeRaised", label: "Dispute raised against session", hint: "When a student files a dispute for their session.", defaultOn: true },
    ],
  },
  {
    id: "admin",
    label: "Admin Alerts",
    tone: "rose" as const,
    items: [
      { id: "newDispute", label: "New dispute opened", hint: "Immediate Slack + email alert to admin team.", defaultOn: true },
      { id: "slaBreach", label: "SLA breach warning (24 hrs)", hint: "Ticket approaching SLA deadline.", defaultOn: true },
      { id: "digest", label: "Daily operations digest", hint: "Summary of enrollments, completions, and revenue at 08:00.", defaultOn: false },
      { id: "fraud", label: "Fraud or chargeback detected", hint: "Payment processor webhook alert.", defaultOn: true },
    ],
  },
];

export const defaultApiKeys = [
  {
    id: "1",
    name: "Production API Key",
    key: "sk_live_...4f2a",
    tags: ["read", "write"],
    status: "active" as const,
    created: "Jan 15, 2026",
  },
];

export const defaultConnectedServices = [
  { name: "Stripe", description: "Payment processing & subscriptions", status: "connected" as const },
  { name: "SendGrid", description: "Transactional email delivery", status: "degraded" as const },
  { name: "LiveKit", description: "Speaking exam live video & recording", status: "connected" as const },
  { name: "Slack", description: "Admin alert notifications", status: "connected" as const },
  { name: "VPS Media", description: "Exam audio & recordings on server disk", status: "disconnected" as const },
];

export const defaultDangerZoneActions = [
  {
    id: "purge",
    label: "Purge All Test Data",
    hint: "Removes all mock/demo enrollments and orders created in test mode. Irreversible.",
    action: "Purge Test Data",
    icon: "trash" as const,
  },
  {
    id: "reset",
    label: "Reset Band Table to Defaults",
    hint: "Reverts to official IELTS conversion tables. Any custom thresholds will be lost.",
    action: "Reset Table",
    icon: "refresh" as const,
  },
];

export function paymentLabel(method: string): string {
  const m = method.toLowerCase();
  if (m.includes("visa")) return "Visa";
  if (m.includes("master")) return "Mastercard";
  if (m.includes("paypal")) return "PayPal";
  if (m.includes("apple")) return "Apple Pay";
  if (m.includes("complimentary")) return "Complimentary";
  if (m.includes("card")) return "Card";
  return method;
}

export function normalizePaymentMethod(method: string): PaymentMethod {
  const m = method.toLowerCase();
  if (m.includes("visa")) return "visa";
  if (m.includes("master")) return "mastercard";
  if (m.includes("paypal")) return "paypal";
  if (m.includes("apple")) return "apple_pay";
  if (m.includes("complimentary")) return "complimentary";
  return "visa";
}
