import type { TicketReporterRole, TicketType } from "@/lib/admin/types";

export type DisputeActionId =
  | "open_enrollment"
  | "open_session"
  | "reappoint"
  | "regrade_writing"
  | "regrade_speaking"
  | "issue_refund"
  | "open_orders"
  | "open_payouts";

export type DisputePlaybook = {
  checklist: { id: string; label: string }[];
  actions: DisputeActionId[];
};

const BASE: Record<TicketType, DisputePlaybook> = {
  regrade_request: {
    checklist: [
      { id: "read", label: "Read the regrade request and linked mock" },
      { id: "review_band", label: "Review current Writing/Speaking bands" },
      { id: "regrade", label: "Trigger regrade if warranted" },
      { id: "notify", label: "Confirm outcome with the student" },
    ],
    actions: [
      "open_enrollment",
      "regrade_writing",
      "regrade_speaking",
    ],
  },
  teacher_no_show: {
    checklist: [
      { id: "read", label: "Verify examiner slot and no-show details" },
      { id: "reschedule", label: "Reappoint mock or reassign examiner" },
      { id: "notify", label: "Confirm new schedule with the student" },
    ],
    actions: ["open_enrollment", "reappoint", "open_session"],
  },
  payment_dispute: {
    checklist: [
      { id: "read", label: "Review billing concern and order history" },
      { id: "verify", label: "Verify charge, refund policy, or access issue" },
      { id: "refund", label: "Issue refund or explain resolution" },
      { id: "notify", label: "Confirm outcome with the reporter" },
    ],
    actions: ["open_orders", "issue_refund"],
  },
  technical_issue: {
    checklist: [
      { id: "read", label: "Identify affected session or device issue" },
      { id: "investigate", label: "Check live session / integrity logs if available" },
      { id: "fix", label: "Reschedule or resolve platform issue" },
      { id: "notify", label: "Confirm fix with the reporter" },
    ],
    actions: ["open_session", "open_enrollment", "reappoint"],
  },
  student_conduct: {
    checklist: [
      { id: "read", label: "Review teacher report and session context" },
      { id: "integrity", label: "Check session integrity / conduct details" },
      { id: "followup", label: "Decide follow-up with student and teacher" },
      { id: "notify", label: "Confirm outcome with the teacher" },
    ],
    actions: ["open_session", "open_enrollment"],
  },
};

export function getDisputePlaybook(
  type: TicketType,
  reporterRole: TicketReporterRole,
): DisputePlaybook {
  if (type === "teacher_no_show" && reporterRole === "teacher") {
    return {
      checklist: [
        { id: "read", label: "Confirm scheduling or attendance issue" },
        { id: "reschedule", label: "Reappoint mock if the student missed the slot" },
        { id: "notify", label: "Confirm outcome with the teacher" },
      ],
      actions: ["open_enrollment", "reappoint", "open_session"],
    };
  }

  if (type === "payment_dispute" && reporterRole === "teacher") {
    return {
      checklist: [
        { id: "read", label: "Review earnings or payout concern" },
        { id: "verify", label: "Check payout records and bank details" },
        { id: "notify", label: "Confirm outcome with the teacher" },
      ],
      actions: ["open_payouts"],
    };
  }

  if (type === "regrade_request" && reporterRole === "teacher") {
    return {
      checklist: [
        { id: "read", label: "Review grading follow-up request" },
        { id: "review", label: "Check assignment and current grade status" },
        { id: "regrade", label: "Trigger regrade if warranted" },
        { id: "notify", label: "Confirm outcome with the teacher" },
      ],
      actions: ["open_enrollment", "regrade_writing", "regrade_speaking"],
    };
  }

  return BASE[type];
}

export function actionLabel(action: DisputeActionId): string {
  switch (action) {
    case "open_enrollment":
      return "Open enrollment";
    case "open_session":
      return "Open live session";
    case "reappoint":
      return "Reappoint mock";
    case "regrade_writing":
      return "Regrade Writing";
    case "regrade_speaking":
      return "Regrade Speaking";
    case "issue_refund":
      return "Issue refund";
    case "open_orders":
      return "Open Orders";
    case "open_payouts":
      return "Open Payouts";
    default:
      return action;
  }
}

export function notifyCopy(role: TicketReporterRole): string {
  if (role === "teacher") {
    return "The teacher who filed this request will be notified.";
  }
  if (role === "student") {
    return "The student who filed this request will be notified.";
  }
  return "The reporter will be notified.";
}
