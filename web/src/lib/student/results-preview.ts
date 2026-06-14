/** Static preview content for Results when no mocks are completed. */
export const resultsPreviewSkills = [
  { id: "listening", name: "Listening", color: "#0ea5e9" },
  { id: "reading", name: "Reading", color: "#10b981" },
  { id: "writing", name: "Writing", color: "#8b5cf6" },
  { id: "speaking", name: "Speaking", color: "#f43f5e" },
] as const;

export const resultsWhatYouGet = [
  "Overall band score with per-skill breakdown",
  "Criteria-level feedback for Writing & Speaking",
  "Score progression across all your attempts",
  "Downloadable PDF report & CSV export",
  "Personalised next-step study recommendations",
] as const;

export const resultsHowItWorks = [
  {
    step: "1",
    title: "Complete all four skills",
    detail: "Listening, Reading, Writing, and Speaking on mock day.",
  },
  {
    step: "2",
    title: "Examiners grade human sections",
    detail: "Writing and Speaking are scored using official IELTS rubrics.",
  },
  {
    step: "3",
    title: "Results released together",
    detail: "All band scores publish once Speaking is graded — typically within 24 hours.",
  },
] as const;
