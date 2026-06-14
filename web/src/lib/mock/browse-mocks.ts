export const fullMockProduct = {
  id: "academic-full-mock-1",
  title: "IELTS Academic Full Mock Exam",
  description:
    "Complete 4-skill exam · Computer-delivered IELTS format · Human-graded W & S",
  examType: "Academic",
  delivery: "Computer-Based",
  rating: 4.9,
  reviewCount: 247,
  price: 49,
  currency: "USD",
  skills: [
    {
      id: "listening",
      name: "Listening",
      detail: "40 questions · 40 min",
      badge: "Auto scored",
      color: "sky" as const,
    },
    {
      id: "reading",
      name: "Reading",
      detail: "40 questions · 60 min",
      badge: "Auto scored",
      color: "emerald" as const,
    },
    {
      id: "writing",
      name: "Writing",
      detail: "2 tasks · 60 min",
      badge: "Human graded",
      color: "violet" as const,
    },
    {
      id: "speaking",
      name: "Speaking",
      detail: "3 parts · 11–14 min",
      badge: "Live examiner",
      color: "rose" as const,
    },
  ],
  included: [
    "Full CBT exam in official IELTS interface",
    "Auto-scored Listening & Reading",
    "Human-graded Writing by certified examiner",
    "1-on-1 Speaking with certified examiner",
    "Detailed band score report (all 4 skills)",
    "Downloadable PDF certificate",
    "Skill-by-skill breakdown & feedback",
  ],
  rules: [
    "All 4 skills on the same calendar day",
    "No pause, no rewind for audio sections",
    "Fullscreen browser required during exam",
    "Valid government ID required at check-in",
    "Strict time limits enforced by system",
    "Results released after Speaking is graded",
    "No retakes within 3 days of same package",
  ],
  highlights: [
    { label: "~4.5 hours total", icon: "clock" as const },
    { label: "Pick your examiner", icon: "user" as const },
    { label: "Results within 24 hrs", icon: "check" as const },
    { label: "Official CBT interface", icon: "globe" as const },
    { label: "Detailed band feedback", icon: "chart" as const },
  ],
};

export const testimonials = [
  {
    id: "1",
    quote:
      "The interface mirrors the real computer-delivered IELTS exam perfectly. I felt completely prepared on test day.",
    name: "Priya M.",
    initials: "PM",
    band: 7.5,
  },
  {
    id: "2",
    quote:
      "Writing and Speaking feedback from the examiner was incredibly detailed and helpful. Best mock platform I tried.",
    name: "Omar K.",
    initials: "OK",
    band: 7.0,
  },
  {
    id: "3",
    quote:
      "Same-day full mock with real timing pressure. The Mock Day Hub made everything smooth from check-in to results.",
    name: "Hana T.",
    initials: "HT",
    band: 6.5,
  },
];

export const browseFaqs = [
  {
    id: "included",
    question: "What is included in the full mock exam?",
    answer:
      "You get a complete 4-skill IELTS Academic mock on one calendar day: Listening and Reading (auto-scored CBT), Writing and Speaking (graded by a certified examiner you choose), plus a full band report and PDF certificate when all sections are complete.",
  },
  {
    id: "duration",
    question: "How long does the whole exam take?",
    answer:
      "Plan for approximately 4.5 hours on exam day: ~40 min Listening, 60 min Reading, 60 min Writing, and an 11–14 min Speaking session at your booked slot. Short controlled breaks are included between CBT sections.",
  },
  {
    id: "results",
    question: "When will I receive my results?",
    answer:
      "Listening and Reading are scored immediately after each section, but all band scores are released together only after your Speaking session is complete and your examiner submits Writing and Speaking grades — typically within 24 hours.",
  },
  {
    id: "pause",
    question: "Can I pause or retake the exam?",
    answer:
      "No. This is a strict mock exam with official rules: no pause, no rewind for audio, and all sections must be completed on the same day. This ensures the most realistic exam experience.",
  },
  {
    id: "graders",
    question: "Who grades my Writing and Speaking?",
    answer:
      "Certified IELTS teachers on our platform. You select your Writing grader and Speaking examiner (with an available time slot) when you book. They use official IELTS rubrics for scoring.",
  },
];
