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

export function submitContactInquiry(body: {
  name: string;
  email: string;
  topic: "General" | "Technical" | "Billing" | "Examiner" | "Institution" | "Press";
  message: string;
}) {
  return apiFetch<{ id: string; ticketId: string; status: string }>(
    "/support/contact",
    { method: "POST", body, auth: false },
  );
}
