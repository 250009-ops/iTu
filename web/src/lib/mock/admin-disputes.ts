export type TicketType =
  | "regrade_request"
  | "teacher_no_show"
  | "technical_issue"
  | "payment_dispute";

export type TicketPriority = "urgent" | "high" | "low";

export type TicketStatus = "open" | "in_progress" | "resolved";

export type SlaState = "active" | "overdue" | "resolved";

export type Ticket = {
  id: string;
  ticketId: string;
  date: string;
  studentName: string;
  initials: string;
  country: string;
  enrollmentRef: string;
  type: TicketType;
  preview: string;
  priority: TicketPriority;
  sla: {
    state: SlaState;
    label: string;
    progress?: number;
    tone?: "amber" | "emerald" | "rose";
  };
  assignee: string | null;
  status: TicketStatus;
};

export const disputesSummary = {
  openTickets: 2,
  urgentOpen: 0,
  inProgress: 1,
  resolvedThisMonth: 2,
  slaBreached: 1,
};

export const ticketsByType = [
  { type: "Regrade Request", count: 2, color: "bg-violet-500", max: 2 },
  { type: "Teacher No-show", count: 1, color: "bg-rose-500", max: 2 },
  { type: "Payment Dispute", count: 1, color: "bg-amber-500", max: 2 },
  { type: "Technical Issue", count: 1, color: "bg-sky-500", max: 2 },
];

export const statusFilterOptions = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
] as const;

export const priorityFilterOptions = [
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

export const tickets: Ticket[] = [
  {
    id: "1",
    ticketId: "TKT-1841",
    date: "Jun 10, 2026",
    studentName: "Alex Johnson",
    initials: "AJ",
    country: "UK",
    enrollmentRef: "ENR-3041",
    type: "regrade_request",
    preview: "Speaking score seems lower than expected — request regrade for Part 2.",
    priority: "high",
    sla: { state: "active", label: "2h left", progress: 25, tone: "amber" },
    assignee: "Sarah (Admin)",
    status: "open",
  },
  {
    id: "2",
    ticketId: "TKT-1840",
    date: "Jun 9, 2026",
    studentName: "Maria Santos",
    initials: "MS",
    country: "BR",
    enrollmentRef: "ENR-3040",
    type: "teacher_no_show",
    preview: "Assigned examiner did not join the speaking session at scheduled time.",
    priority: "urgent",
    sla: { state: "overdue", label: "Overdue" },
    assignee: "James (Admin)",
    status: "in_progress",
  },
  {
    id: "3",
    ticketId: "TKT-1839",
    date: "Jun 8, 2026",
    studentName: "Kai Chen",
    initials: "KC",
    country: "CN",
    enrollmentRef: "ENR-3039",
    type: "technical_issue",
    preview: "Listening audio cut out during Part 3 — unable to complete section.",
    priority: "low",
    sla: { state: "resolved", label: "Resolved" },
    assignee: "James (Admin)",
    status: "resolved",
  },
  {
    id: "4",
    ticketId: "TKT-1838",
    date: "Jun 8, 2026",
    studentName: "Priya Sharma",
    initials: "PS",
    country: "IN",
    enrollmentRef: "ENR-3038",
    type: "payment_dispute",
    preview: "Charged twice for the same mock exam enrollment — requesting refund.",
    priority: "high",
    sla: { state: "active", label: "6h left", progress: 72, tone: "emerald" },
    assignee: null,
    status: "open",
  },
  {
    id: "5",
    ticketId: "TKT-1835",
    date: "Jun 5, 2026",
    studentName: "James Park",
    initials: "JP",
    country: "KR",
    enrollmentRef: "ENR-3035",
    type: "regrade_request",
    preview: "Writing Task 2 marked incorrectly — band 6.0 expected, received 5.5.",
    priority: "low",
    sla: { state: "resolved", label: "Resolved" },
    assignee: "Sarah (Admin)",
    status: "resolved",
  },
];
