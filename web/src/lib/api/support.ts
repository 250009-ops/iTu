import { apiFetch } from "./client";

export type SupportTicketType =
  | "regrade_request"
  | "teacher_no_show"
  | "technical_issue"
  | "payment_dispute"
  | "student_conduct";

export type MySupportTicket = {
  id: string;
  ticketId: string;
  subject: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
};

export function createSupportTicket(body: {
  subject: string;
  message: string;
  type?: SupportTicketType;
  enrollmentId?: string;
  relatedRef?: string;
}) {
  return apiFetch<{
    id: string;
    ticketId: string;
    status: string;
    type?: string;
    priority?: string;
  }>("/support/tickets", { method: "POST", body });
}

export function getMySupportTickets() {
  return apiFetch<MySupportTicket[]>("/support/tickets/mine");
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
