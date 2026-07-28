import type { SupportTicketType } from "@/lib/api/support";

export type HelpRole =
  | "student"
  | "teacher"
  | "admin"
  | "institution"
  | "inst_student"
  | "inst_examiner";

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
    hint: "Pay cycles, card details, or missing earnings",
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

export const INSTITUTION_HELP_CATEGORIES: HelpCategory[] = [
  {
    value: "payment_dispute",
    label: "Mock sets & billing",
    hint: "Granted test sets or wholesale pricing",
  },
  {
    value: "technical_issue",
    label: "Student enrollment",
    hint: "Enroll wizard, granted mocks, or student access",
  },
  {
    value: "technical_issue",
    label: "Examiner management",
    hint: "Invites, access, or centre examiner setup",
  },
  {
    value: "technical_issue",
    label: "Centre account",
    hint: "Profile, public page, or centre status",
  },
  {
    value: "technical_issue",
    label: "Platform technical issue",
    hint: "Portal bugs, reports, or system errors",
  },
];

export const INST_STUDENT_HELP_CATEGORIES: HelpCategory[] = [
  {
    value: "technical_issue",
    label: "Centre access & approval",
    hint: "Pending approval or cannot access your mock",
  },
  {
    value: "technical_issue",
    label: "Mock scheduling",
    hint: "Dates, times, or rescheduling with your centre",
    requiresRelated: true,
  },
  {
    value: "regrade_request",
    label: "Results & regrade",
    hint: "Question about bands or request a review",
    requiresRelated: true,
  },
  {
    value: "teacher_no_show",
    label: "Examiner no-show",
    hint: "Speaking examiner missed your slot",
    requiresRelated: true,
  },
  {
    value: "technical_issue",
    label: "Technical issue",
    hint: "Exam app, audio, camera, or login problems",
    requiresRelated: true,
  },
];

export const INST_EXAMINER_HELP_CATEGORIES: HelpCategory[] = [
  {
    value: "student_conduct",
    label: "Student conduct",
    hint: "Misbehavior, integrity, or session disruption",
    requiresRelated: true,
  },
  {
    value: "teacher_no_show",
    label: "Scheduling & attendance",
    hint: "Student no-show, slot changes, or timing",
    requiresRelated: true,
  },
  {
    value: "regrade_request",
    label: "Grading follow-up",
    hint: "Grading questions or regrade outcomes",
    requiresRelated: true,
  },
  {
    value: "technical_issue",
    label: "Technical / centre coordination",
    hint: "Platform, audio/video, grading tools, or centre scheduling",
  },
];

export const STUDENT_HELP_FAQS: HelpFaq[] = [
  {
    q: "When are my results released?",
    a: "Band scores appear once every skill included in the student's package has been graded. Listening and Reading are auto-scored; Writing and Speaking release as soon as their examiners submit (Writing-only / Speaking-only packages do not wait for other skills).",
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
    a: "Earnings accrue per completed graded session. Request a payout from Earnings once card details are saved and the cycle allows transfers.",
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

export const INSTITUTION_HELP_FAQS: HelpFaq[] = [
  {
    q: "Where do requests from my students and examiners appear?",
    a: "Open Centre requests in the sidebar. That inbox is separate from this page, which is for contacting iTestU platform support.",
  },
  {
    q: "How do purchased / granted test sets work?",
    a: "iTestU admin grants or you purchase a test set. Open Tests → Purchased set in the sidebar to see the included section tests (read-only). Assemble enrollable mocks on the Mocks page from those tests and/or Content Studio tests, then enroll students from Mocks or Students.",
  },
  {
    q: "A student is stuck in pending — what should I do?",
    a: "Open Students → Pending and approve or reject the application. Students waiting for approval can also message you via Help.",
  },
  {
    q: "How do I invite an examiner to my centre?",
    a: "Go to Examiners → Invite examiner. They receive an email to set up their scoped portal account for your centre only.",
  },
  {
    q: "Who handles exam-day technical failures?",
    a: "Your centre coordinates locally first. Escalate to iTestU platform support from this page if the issue is a system bug affecting the exam app.",
  },
];

export const INST_STUDENT_HELP_FAQS: HelpFaq[] = [
  {
    q: "Why am I waiting for approval?",
    a: "Your centre must approve your application before you can sit mocks. Submit a request here or contact your centre coordinator directly.",
  },
  {
    q: "Who schedules my mock?",
    a: "Your edu centre assigns and schedules mocks. Contact them for date changes — not the iTestU marketplace flow.",
  },
  {
    q: "When are my results released?",
    a: "After all sections are graded. Your centre and iTestU examiners complete Writing and Speaking before the full report is released.",
  },
  {
    q: "I disagree with a band score — what can I do?",
    a: "Submit a Results & regrade request here. Your centre receives it first and coordinates with examiners or escalates to platform support if needed.",
  },
  {
    q: "Who do I pay for the mock?",
    a: "Billing is arranged with your centre. iTestU does not charge centre students directly for mocks enrolled by the institution.",
  },
];

export const INST_EXAMINER_HELP_FAQS: HelpFaq[] = [
  {
    q: "How am I paid as a centre examiner?",
    a: "iTestU does not process your pay. Compensation is arranged directly with your centre — cash, transfer, or other agreement between you and the institution.",
  },
  {
    q: "What students do I see?",
    a: "Only students enrolled through your centre appear in your Speaking and Writing queues. You do not have marketplace-wide availability.",
  },
  {
    q: "What is the Writing grading SLA?",
    a: "Grade Writing submissions within the published window. Overdue items are highlighted on your Writing Grading queue.",
  },
  {
    q: "A student misbehaved during a session — what should I do?",
    a: "Submit a Student conduct request and link the session. Your centre admin receives it and handles follow-up.",
  },
  {
    q: "I have a scheduling conflict — who do I contact?",
    a: "Contact your centre coordinator first using Scheduling & attendance or Technical / centre coordination. They manage your timetable and local arrangements.",
  },
];

const ALL_CATEGORIES: HelpCategory[] = [
  ...STUDENT_HELP_CATEGORIES,
  ...TEACHER_HELP_CATEGORIES,
  ...ADMIN_HELP_CATEGORIES,
  ...INSTITUTION_HELP_CATEGORIES,
  ...INST_STUDENT_HELP_CATEGORIES,
  ...INST_EXAMINER_HELP_CATEGORIES,
];

export function categoriesForRole(role: HelpRole): HelpCategory[] {
  switch (role) {
    case "teacher":
      return TEACHER_HELP_CATEGORIES;
    case "admin":
      return ADMIN_HELP_CATEGORIES;
    case "institution":
      return INSTITUTION_HELP_CATEGORIES;
    case "inst_student":
      return INST_STUDENT_HELP_CATEGORIES;
    case "inst_examiner":
      return INST_EXAMINER_HELP_CATEGORIES;
    default:
      return STUDENT_HELP_CATEGORIES;
  }
}

export function faqsForRole(role: HelpRole): HelpFaq[] {
  switch (role) {
    case "teacher":
      return TEACHER_HELP_FAQS;
    case "admin":
      return ADMIN_HELP_FAQS;
    case "institution":
      return INSTITUTION_HELP_FAQS;
    case "inst_student":
      return INST_STUDENT_HELP_FAQS;
    case "inst_examiner":
      return INST_EXAMINER_HELP_FAQS;
    default:
      return STUDENT_HELP_FAQS;
  }
}

export function ticketTypeLabel(type: string): string {
  const match = ALL_CATEGORIES.find((c) => c.value === type);
  if (match) return match.label;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function portalLabelForRole(role: HelpRole): string {
  switch (role) {
    case "teacher":
      return "Teacher Portal";
    case "admin":
      return "Admin";
    case "institution":
      return "Institution Portal";
    case "inst_student":
      return "Centre Student Portal";
    case "inst_examiner":
      return "Centre Examiner Portal";
    default:
      return "Student Portal";
  }
}

export function helpDescriptionForRole(role: HelpRole): string {
  switch (role) {
    case "teacher":
      return "Report session issues, student conduct, or payout questions. Every request lands in the Admin Disputes queue with the right category and priority.";
    case "admin":
      return "Internal tickets and billing follow-ups. Student and teacher requests already appear on Disputes — use this only when you need a tracked note.";
    case "institution":
      return "Contact iTestU platform support for mock set grants, enrollment tools, and portal issues. Use Centre requests in the sidebar for messages from your students and examiners.";
    case "inst_student":
      return "Send requests to your edu centre first — approval, scheduling, results, and exam-day issues. Your centre coordinator receives and responds to each ticket.";
    case "inst_examiner":
      return "Contact your centre for scheduling and compensation. iTestU does not pay centre examiners — payment is arranged directly with your institution.";
    default:
      return "Ask about results, examiners, payments, or exam-day tech. Pick a category so Admin sees the right ticket type — not a generic catch-all.";
  }
}
