import { apiFetch } from "./client";

export function createSupportTicket(body: {
  subject: string;
  message: string;
  type?:
    | "regrade_request"
    | "teacher_no_show"
    | "technical_issue"
    | "payment_dispute";
  enrollmentId?: string;
}) {
  return apiFetch<{ id: string; ticketId: string; status: string }>(
    "/support/tickets",
    { method: "POST", body },
  );
}
