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
  { id: "exam_integrity", label: "Exam Integrity", description: "Proctoring flags & warnings" },
  { id: "commission", label: "Commission", description: "Rates & payout rules" },
  { id: "band_table", label: "Band Table", description: "Raw score conversion" },
  { id: "notifications", label: "Notifications", description: "Alerts & email triggers" },
  { id: "integrations", label: "Integrations", description: "Connected services status" },
  { id: "account", label: "Account", description: "Your password & security" },
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
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
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
  { value: "complimentary", label: "Complimentary" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
] as const;

export const disputeStatusFilterOptions = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export const disputePriorityFilterOptions = [
  { value: "all", label: "All Priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
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
  student_conduct: {
    label: "Student Conduct",
    iconTone: "text-orange-600 bg-orange-100",
    pill: "text-orange-700",
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
  sky: "bg-sky-50 text-sky-700",
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
      { id: "results", label: "Results published notification", hint: "Email + in-app when all modules are graded.", defaultOn: true },
    ],
  },
  {
    id: "teacher",
    label: "Teacher Notifications",
    tone: "emerald" as const,
    items: [
      { id: "assigned", label: "New session assigned", hint: "Sent when admin assigns a student session.", defaultOn: true },
      { id: "payout", label: "Payout processed", hint: "Weekly payout confirmation with breakdown.", defaultOn: true },
    ],
  },
  {
    id: "admin",
    label: "Admin Alerts",
    tone: "rose" as const,
    items: [
      { id: "newDispute", label: "New dispute opened", hint: "Email alert when a dispute or support ticket is opened.", defaultOn: true },
      { id: "slaBreach", label: "SLA breach warning (24 hrs)", hint: "In-app alert when a ticket approaches SLA deadline.", defaultOn: true },
    ],
  },
];

export const defaultExamIntegrityFlags = [
  {
    id: "flagOnTabSwitch",
    label: "Flag on tab switch",
    hint: "Record when the candidate leaves the exam tab or window.",
    defaultOn: true,
  },
  {
    id: "flagOnPaste",
    label: "Flag on paste",
    hint: "Record clipboard paste attempts during Writing and similar inputs.",
    defaultOn: true,
  },
  {
    id: "flagOnFullscreenExit",
    label: "Flag on fullscreen exit",
    hint: "Record when the candidate exits fullscreen exam mode.",
    defaultOn: true,
  },
  {
    id: "flagOnAudioSeek",
    label: "Flag on audio seek",
    hint: "Record scrubbing or seeking of Listening audio.",
    defaultOn: true,
  },
] as const;

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
  // Uzum Checkout / booking default — card payment via redirect.
  if (m.includes("card")) return "visa";
  return "visa";
}
