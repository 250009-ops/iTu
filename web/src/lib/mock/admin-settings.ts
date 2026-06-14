export type SettingsTab =
  | "general"
  | "exam_timers"
  | "commission"
  | "band_table"
  | "notifications"
  | "integrations";

export type PayoutSchedule = "weekly" | "biweekly" | "monthly";

export const settingsMeta = {
  lastSaved: "Jun 10, 2026 at 09:14 AM",
  unsavedChanges: 3,
};

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

export const generalSettings = {
  platformName: "IELTS Mock Platform",
  supportEmail: "support@ielts-mock.com",
  adminContact: "admin@ielts-mock.com",
  platformUrl: "https://ielts-mock.com",
  timezone: "UTC+0 (London)",
  defaultLanguage: "English (en-GB)",
};

export const examPolicies = [
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

export const maintenancePolicy = {
  label: "Maintenance Mode",
  hint: "Students see a scheduled downtime message; no new bookings accepted.",
  defaultOn: false,
};

export const examTimers = [
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

export const commissionSettings = {
  platformCommission: 25,
  speakingRate: 25,
  writingRate: 35,
  disputeRefundCap: 100,
  payoutSchedule: "weekly" as PayoutSchedule,
};

export const bandConversionTable = [
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

export const notificationGroups = [
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

export const apiKeys = [
  {
    id: "1",
    name: "Production API Key",
    key: "sk_live_...4f2a",
    tags: ["read", "write"],
    status: "active" as const,
    created: "Jan 15, 2026",
  },
  {
    id: "2",
    name: "Webhook Signing Secret",
    key: "whsec_...9c1b",
    tags: ["webhooks"],
    status: "active" as const,
    created: "Mar 2, 2026",
  },
  {
    id: "3",
    name: "Read-only Reporting Key",
    key: "sk_ro_...7d4e",
    tags: ["read"],
    status: "active" as const,
    created: "May 10, 2026",
  },
];

export const connectedServices = [
  { name: "Stripe", description: "Payment processing & subscriptions", status: "connected" as const },
  { name: "SendGrid", description: "Transactional email delivery", status: "degraded" as const },
  { name: "LiveKit", description: "Speaking exam live video & recording", status: "connected" as const },
  { name: "Slack", description: "Admin alert notifications", status: "connected" as const },
  { name: "AWS S3", description: "Exam recording & file storage", status: "disconnected" as const },
];

export const dangerZoneActions = [
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
  {
    id: "export",
    label: "Export & Delete Account",
    hint: "Download full data export then schedule account deletion. 30-day grace period applies.",
    action: "Request Export",
    icon: "download" as const,
  },
];
