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

export type CentreContact = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  city: string | null;
};

export function getCentreContact() {
  return apiFetch<CentreContact>("/support/centre-contact");
}

export type InstitutionSupportRequest = {
  id: string;
  ticketId: string;
  subject: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  reporter: { name: string; role: string } | null;
  relatedRef: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export function getInstitutionSupportRequests() {
  return apiFetch<InstitutionSupportRequest[]>("/institution/support/requests");
}

export function updateInstitutionSupportRequest(
  id: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
) {
  return apiFetch<{ id: string; ticketId: string; status: string }>(
    `/institution/support/requests/${id}`,
    { method: "PATCH", body: { status } },
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
