import type { SupportTicketType } from "@/lib/api/support";

export type HelpRole = "student" | "teacher" | "admin";

export type HelpCategory = {
  value: SupportTicketType;
  label: string;
  hint: string;
  requiresRelated?: boolean;
};

export type HelpFaq = { q: string; a: string };

export const STUDENT_HELP_CATEGORIES: HelpCategory[] = [
  {
    value: "regrade_request",
    label: "Regrade request",
    hint: "Disagree with Writing or Speaking band",
    requiresRelated: true,
  },
  {
    value: "teacher_no_show",
    label: "Examiner no-show",
    hint: "Speaking examiner missed the scheduled slot",
    requiresRelated: true,
  },
  {
    value: "payment_dispute",
    label: "Payment & billing",
    hint: "Charges, refunds, or package access",
  },
  {
    value: "technical_issue",
    label: "Technical issue",
    hint: "Exam app, audio, camera, or login problems",
  },
];

export const TEACHER_HELP_CATEGORIES: HelpCategory[] = [
  {
    value: "student_conduct",
    label: "Student conduct",
    hint: "Misbehavior, integrity, or session disruption",
    requiresRelated: true,
  },
  {
    value: "teacher_no_show",
    label: "Scheduling / attendance",
    hint: "Student no-show, slot conflicts, or timing issues",
    requiresRelated: true,
  },
  {
    value: "payment_dispute",
    label: "Earnings & payouts",
    hint: "Pay cycles, bank details, or missing earnings",
  },
  {
    value: "technical_issue",
    label: "Technical issue",
    hint: "Platform, audio/video, or grading tools",
  },
  {
    value: "regrade_request",
    label: "Grading follow-up",
    hint: "Regrade outcome or assignment questions",
    requiresRelated: true,
  },
];

export const ADMIN_HELP_CATEGORIES: HelpCategory[] = [
  {
    value: "technical_issue",
    label: "Internal note / tech",
    hint: "Platform ops or internal follow-up ticket",
  },
  {
    value: "payment_dispute",
    label: "Billing follow-up",
    hint: "Refunds or payment investigations",
  },
];

export const STUDENT_HELP_FAQS: HelpFaq[] = [
  {
    q: "When are my results released?",
    a: "Full band scores appear after Speaking is finished and Writing plus Speaking grades are complete. Listening and Reading are auto-scored, but the report stays hidden until the whole mock is graded.",
  },
  {
    q: "Can I pause or restart a section?",
    a: "No. Timers follow computer-delivered IELTS rules — server-authoritative with no pause or rewind. Each section auto-submits when time ends.",
  },
  {
    q: "How do I reschedule my mock day or Speaking slot?",
    a: "Open Mock Day Hub before your scheduled date and use reschedule, or send a support request. Speaking slots depend on examiner availability.",
  },
  {
    q: "I disagree with my Writing or Speaking band — what can I do?",
    a: "Submit a Regrade request from this page and link the related mock. A second review follows the published SLA.",
  },
  {
    q: "What do I need for device check?",
    a: "Stable internet, a working microphone and camera for Speaking, and a modern browser. Check-in verifies these before the exam begins.",
  },
];

export const TEACHER_HELP_FAQS: HelpFaq[] = [
  {
    q: "How do Speaking slots and availability work?",
    a: "Set weekly availability under Availability. Students book open slots. Block individual slots when you need time off; the buffer between sessions is applied automatically.",
  },
  {
    q: "What is the Writing grading SLA?",
    a: "Writing submissions should be graded within the published window (typically 48 hours). Overdue items appear on your Writing Grading queue with urgency markers.",
  },
  {
    q: "When do I get paid?",
    a: "Earnings accrue per completed graded session. Request a payout from Earnings once bank details are saved and the cycle allows transfers.",
  },
  {
    q: "A student misbehaved or broke integrity rules — what should I do?",
    a: "Submit a Student conduct request here and link the session or student. Admin reviews the case on Disputes and follows up with both parties as needed.",
  },
  {
    q: "Audio or video failed during Speaking — can I continue?",
    a: "Try reconnecting once. If the session cannot continue, end safely and file a Technical issue with the student name and scheduled time so Admin can reschedule.",
  },
];

export const ADMIN_HELP_FAQS: HelpFaq[] = [
  {
    q: "Where do Teacher and Student requests appear?",
    a: "All portal support tickets land on Admin → Disputes with reporter role, category, priority, and related mock/session context.",
  },
  {
    q: "How is priority set?",
    a: "Priority is assigned from the ticket category (for example payment and conduct are High). SLA countdown follows that priority window.",
  },
  {
    q: "Who is notified when I resolve a ticket?",
    a: "The person who filed the request (student or teacher) receives an in-app notification pointing back to their Help page.",
  },
];

export function categoriesForRole(role: HelpRole): HelpCategory[] {
  if (role === "teacher") return TEACHER_HELP_CATEGORIES;
  if (role === "admin") return ADMIN_HELP_CATEGORIES;
  return STUDENT_HELP_CATEGORIES;
}

export function faqsForRole(role: HelpRole): HelpFaq[] {
  if (role === "teacher") return TEACHER_HELP_FAQS;
  if (role === "admin") return ADMIN_HELP_FAQS;
  return STUDENT_HELP_FAQS;
}

export function ticketTypeLabel(type: string): string {
  const all = [
    ...STUDENT_HELP_CATEGORIES,
    ...TEACHER_HELP_CATEGORIES,
    ...ADMIN_HELP_CATEGORIES,
  ];
  const match = all.find((c) => c.value === type);
  if (match) return match.label;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
