export type TestStatus = "published" | "draft" | "review";
export type ContentModule = "listening" | "reading" | "writing" | "speaking";

export type ContentTest = {
  id: string;
  name: string;
  module: ContentModule;
  status: TestStatus;
  questions: number;
  lastUpdated: string;
  author: string;
};

export const contentSummary = {
  total: 6,
  published: 2,
  underReview: 2,
  drafts: 2,
};

export const moduleTabs: { id: ContentModule; label: string; count: number }[] = [
  { id: "listening", label: "Listening", count: 2 },
  { id: "reading", label: "Reading", count: 2 },
  { id: "writing", label: "Writing", count: 1 },
  { id: "speaking", label: "Speaking", count: 1 },
];

export const contentTests: ContentTest[] = [
  {
    id: "l12",
    name: "Test #12 — Furniture Shop",
    module: "listening",
    status: "published",
    questions: 40,
    lastUpdated: "Jun 8",
    author: "Admin",
  },
  {
    id: "l13",
    name: "Test #13 — Campus Tour",
    module: "listening",
    status: "draft",
    questions: 32,
    lastUpdated: "Jun 12",
    author: "Admin",
  },
  {
    id: "r10",
    name: "Test #10 — Urban Planning",
    module: "reading",
    status: "published",
    questions: 40,
    lastUpdated: "Jun 5",
    author: "Admin",
  },
  {
    id: "r11",
    name: "Test #11 — Marine Biology",
    module: "reading",
    status: "review",
    questions: 40,
    lastUpdated: "Jun 10",
    author: "Admin",
  },
  {
    id: "w8",
    name: "Test #8 — Task 2 Essay Set",
    module: "writing",
    status: "review",
    questions: 2,
    lastUpdated: "Jun 9",
    author: "Admin",
  },
  {
    id: "s5",
    name: "Test #5 — Speaking Cue Cards",
    module: "speaking",
    status: "draft",
    questions: 12,
    lastUpdated: "Jun 11",
    author: "Admin",
  },
];

export const questionTypes = [
  "Note Completion",
  "Multiple Choice",
  "Matching",
  "Form Completion",
  "Map Labelling",
] as const;

export const listeningParts = ["Part 1", "Part 2", "Part 3", "Part 4"] as const;
