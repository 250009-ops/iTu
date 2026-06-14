export const browseFaqs = [
  {
    id: "included",
    question: "What is included in a full mock exam?",
    answer:
      "You get a complete 4-skill IELTS mock (Academic or General Training) on one calendar day: Listening and Reading (auto-scored CBT), Writing and Speaking (graded by a certified examiner you choose), plus a full band report when all sections are complete.",
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

export type BrowseHighlightIcon = "clock" | "user" | "check" | "globe" | "chart";

export type BrowseHighlight = { label: string; icon: BrowseHighlightIcon };

export const fullMockHighlights: BrowseHighlight[] = [
  { label: "~4.5 hours total", icon: "clock" },
  { label: "Pick your certified examiner", icon: "user" },
  { label: "Results within 24 hours", icon: "check" },
  { label: "Official CBT interface", icon: "globe" },
  { label: "Detailed band feedback", icon: "chart" },
];

export const speakingOnlyHighlights: BrowseHighlight[] = [
  { label: "11–14 minutes live", icon: "clock" },
  { label: "Pick your certified examiner", icon: "user" },
  { label: "Results within 24 hours", icon: "check" },
  { label: "Live video session", icon: "globe" },
  { label: "Detailed band feedback", icon: "chart" },
];

export const writingOnlyHighlights: BrowseHighlight[] = [
  { label: "60-minute window", icon: "clock" },
  { label: "Certified examiner grading", icon: "user" },
  { label: "Results within 24 hours", icon: "check" },
  { label: "Task 1 + Task 2", icon: "globe" },
  { label: "Criteria-level feedback", icon: "chart" },
];

/** @deprecated Use package-specific highlights from mapBrowseProduct */
export const browseHighlights = fullMockHighlights;

export const defaultExamRules = [
  "Fullscreen required for all sections",
  "No pause/rewind in Listening",
  "All sections must be completed today",
  "Do not navigate away mid-section",
];

export const speakingTip =
  "For Part 3, use hedging language — \"I would argue that...\", \"It seems to me that...\" — to handle abstract questions fluently without long pauses.";
