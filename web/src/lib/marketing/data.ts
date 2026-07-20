// Central content source for the public marketing website.
// Field names mirror the production ERP model (TeacherProfile, MockTestPackage,
// Grade, StudentProfile) so design and data stay 1:1.

import { formatPrice } from "@/lib/format-price";

export type SkillId = "listening" | "reading" | "writing" | "speaking";
export type AccentColor = "sky" | "emerald" | "violet" | "rose";

export const SITE = {
  name: "iTestU",
  /** Common search / legacy spellings — use in SEO schema and keywords only. */
  alternateNames: ["ITestU", "itestu", "iTu"] as const,
  domain: "https://www.itestu.uz",
  tagline: "Real examiners. Real feedback. Real bands.",
  description:
    "iTestU (iTu) — realistic computer-delivered IELTS mocks with certified examiner feedback, plus Reading, Listening, and AI Writing practice packages you can buy anytime.",
  foundedYear: 2026,
  fullMockPrice: 56_000,
  currency: "UZS",
  supportEmail: "support@itestu.uz",
} as const;

/** Shared legal / policy copy — keep pages in sync via these constants. */
export const LEGAL = {
  supportEmail: SITE.supportEmail,
  refundWindowHours: 48,
  refundPolicy:
    "You may reschedule an upcoming mock from your account before check-in. Refund requests are handled by our support team — email support@itestu.uz with your booking reference.",
  cookiesSection:
    "iTestU does not use analytics or advertising cookies. When you sign in with Remember me checked, we store your session in local storage so you stay signed in across browser restarts. Without Remember me, the session is kept in session storage for the current browser session only. During exams, we also use session storage for in-exam settings such as accessibility preferences. You can clear this data anytime through your browser settings or by signing out.",
  privacyIntroRights:
    "Depending on your location, you may have rights to access, correct, or delete your personal data. Contact us to exercise these rights.",
} as const;

/** Product claims used across marketing pages — must match shipped features. */
export const PRODUCT_CLAIMS = {
  resultsTiming:
    "Listening and Reading are auto-scored instantly. Writing and Speaking are graded by your examiner — all four bands release together once Speaking is submitted, typically the same day.",
  examinerChoice:
    "When you book, browse certified examiners, see their ratings, and select who grades your Writing and conducts your Speaking session.",
  academicOnlyNote:
    "Full Academic mocks and single-skill modules (Listening, Reading, Writing, Speaking) are available now. General Training is coming soon.",
  checkInIdentity:
    "Confirm your identity and complete a device check at check-in before your first section.",
  desktopOptional:
    "Optional desktop app for exam day — book and prepare in your browser; download only if you want the dedicated app.",
  practice:
    "Self-paced practice packages for Reading passages, Listening sections, question-type drills, and AI Writing essay reviews — buy credits anytime from your student account. No examiner booking required.",
  practiceVsMock:
    "Mocks are full exam-day simulations with human-graded Writing and Speaking. Practice packages are flexible drills you complete on your own schedule — ideal between mocks.",
} as const;

/** Brand + product terms for meta keywords across marketing pages. */
export const SITE_KEYWORDS = [
  "itestu",
  "ITestU",
  "iTestU",
  "itestu.uz",
  "iTu IELTS mock",
  "IELTS mock exam",
  "IELTS practice test",
  "computer-delivered IELTS",
  "IELTS Writing feedback",
  "IELTS Speaking mock",
  "IELTS band score",
  "IELTS mock Uzbekistan",
  "computer-delivered IELTS practice",
] as const;

export const NAV_LINKS = [
  { label: "Mock Exams", href: "/mock-exams" },
  { label: "Practice", href: "/practice" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Teachers", href: "/teachers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Results", href: "/results" },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Mock Exams", href: "/mock-exams" },
      { label: "Practice Tests", href: "/practice" },
      { label: "Pricing", href: "/pricing" },
      { label: "Results", href: "/results" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Desktop app (optional)", href: "/download" },
    ],
  },
  {
    title: "For",
    links: [
      { label: "Students", href: "/for-students" },
      { label: "Teachers", href: "/for-teachers" },
      { label: "Edu Centers", href: "/centers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Exam Rules", href: "/how-it-works" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
] as const;

export const SKILL_META: Record<
  SkillId,
  { name: string; accent: AccentColor; icon: SkillId; grading: "Auto-scored" | "Teacher-graded" }
> = {
  listening: { name: "Listening", accent: "sky", icon: "listening", grading: "Auto-scored" },
  reading: { name: "Reading", accent: "emerald", icon: "reading", grading: "Auto-scored" },
  writing: { name: "Writing", accent: "violet", icon: "writing", grading: "Teacher-graded" },
  speaking: { name: "Speaking", accent: "rose", icon: "speaking", grading: "Teacher-graded" },
};

export const SKILLS: Array<{
  id: SkillId;
  name: string;
  accent: AccentColor;
  grading: string;
  duration: string;
  claim: string;
}> = [
  {
    id: "listening",
    name: "Listening",
    accent: "sky",
    grading: "Auto-scored",
    duration: "~32 min",
    claim: "Server-driven audio, plays once, no rewind.",
  },
  {
    id: "reading",
    name: "Reading",
    accent: "emerald",
    grading: "Auto-scored",
    duration: "60 min",
    claim: "Exact computer-delivered layout, 3 passages, 60-minute timer.",
  },
  {
    id: "writing",
    name: "Writing",
    accent: "violet",
    grading: "Teacher-graded",
    duration: "60 min",
    claim: "Task 1 + Task 2 with live word count and expert criteria feedback.",
  },
  {
    id: "speaking",
    name: "Speaking",
    accent: "rose",
    grading: "Teacher-graded",
    duration: "11–14 min",
    claim: "Live video call with a certified examiner, 11–14 min.",
  },
];

export const STATS = [
  { id: "mocks", value: 9500, suffix: "+", label: "Mocks delivered" },
  { id: "improvement", prefix: "+", value: 1.5, decimals: 1, label: "Avg. band improvement" },
  { id: "rating", value: 4.9, decimals: 1, suffix: "★", label: "Examiner rating" },
  { id: "examiners", value: 320, suffix: "+", label: "Certified examiners" },
] as const;

export const JOURNEY_STEPS = [
  { id: "book", label: "Book", caption: "Pick package & examiner", accent: "emerald" as AccentColor, icon: "book" },
  { id: "check-in", label: "Check-in", caption: "Identity confirm & device check", accent: "sky" as AccentColor, icon: "check" },
  { id: "listening", label: "Listening", caption: "~32 min · plays once", accent: "sky" as AccentColor, icon: "listening" },
  { id: "reading", label: "Reading", caption: "60 min · 3 passages", accent: "emerald" as AccentColor, icon: "reading" },
  { id: "writing", label: "Writing", caption: "60 min · Task 1 + 2", accent: "violet" as AccentColor, icon: "writing" },
  { id: "speaking", label: "Speaking", caption: "Live video · 11–14 min", accent: "rose" as AccentColor, icon: "speaking" },
  { id: "results", label: "Results", caption: "Bands when all skills graded", accent: "emerald" as AccentColor, icon: "results" },
] as const;

export interface TopStudent {
  id: string;
  rank: number;
  name: string;
  initials: string;
  country: string;
  overallBand: number;
  skillBands: { listening: number; reading: number; writing: number; speaking: number };
  improvementDelta: number;
  accent: AccentColor;
}

export const TOP_STUDENTS: TopStudent[] = [
  { id: "s1", rank: 1, name: "Aisha Karimova", initials: "AK", country: "UZ", overallBand: 8.5, skillBands: { listening: 9, reading: 8.5, writing: 8, speaking: 8.5 }, improvementDelta: 1.0, accent: "sky" },
  { id: "s2", rank: 2, name: "Lucas Brennan", initials: "LB", country: "AU", overallBand: 8.0, skillBands: { listening: 8.5, reading: 8, writing: 7.5, speaking: 8 }, improvementDelta: 1.0, accent: "emerald" },
  { id: "s3", rank: 3, name: "Mei Tanaka", initials: "MT", country: "JP", overallBand: 8.0, skillBands: { listening: 8, reading: 8, writing: 7.5, speaking: 8.5 }, improvementDelta: 1.0, accent: "violet" },
  { id: "s4", rank: 4, name: "Carlos Mendoza", initials: "CM", country: "MX", overallBand: 7.5, skillBands: { listening: 7.5, reading: 8, writing: 7, speaking: 7.5 }, improvementDelta: 0.5, accent: "rose" },
  { id: "s5", rank: 5, name: "Fatima Al-Rashid", initials: "FA", country: "AE", overallBand: 7.5, skillBands: { listening: 8, reading: 7.5, writing: 7, speaking: 7.5 }, improvementDelta: 0.5, accent: "sky" },
  { id: "s6", rank: 6, name: "Priya Sharma", initials: "PS", country: "IN", overallBand: 7.5, skillBands: { listening: 7.5, reading: 7.5, writing: 7.5, speaking: 7.5 }, improvementDelta: 0.5, accent: "emerald" },
  { id: "s7", rank: 7, name: "James O'Brien", initials: "JO", country: "IE", overallBand: 7.0, skillBands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 7 }, improvementDelta: 0.5, accent: "violet" },
];

export type TeacherSpeciality = "Writing" | "Speaking" | "Writing & Speaking";

export interface TeacherReview {
  id: string;
  name: string;
  rating: number;
  quote: string;
}

export interface TopTeacher {
  id: string;
  slug: string;
  name: string;
  initials: string;
  speciality: TeacherSpeciality;
  accent: AccentColor;
  rating: number;
  reviewCount: number;
  totalSessions: number;
  bio: string;
  longBio: string;
  credentials: string[];
  languages: string[];
  isTopRated: boolean;
  sampleFeedback: { label: string; quote: string };
  reviews: TeacherReview[];
  photoSeed: string;
}

export const TOP_TEACHERS: TopTeacher[] = [
  {
    id: "t1",
    slug: "daniel-whitfield",
    name: "Daniel Whitfield",
    initials: "DW",
    speciality: "Writing & Speaking",
    accent: "violet",
    rating: 4.9,
    reviewCount: 1240,
    totalSessions: 1280,
    bio: "Former IELTS examiner with 12 years coaching Band 8+ writing and speaking. Delivers precise criteria-level feedback that transforms candidates.",
    longBio:
      "Daniel spent 8 years as a practising IELTS examiner before transitioning to specialist coaching. He holds an MA in Applied Linguistics from the University of Edinburgh and a CELTA qualification. His writing feedback is structured around the official IELTS marking criteria — Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy — and his candidates consistently report score improvements of 1+ band within two attempts. He conducts Speaking sessions in a natural, low-pressure style that helps candidates perform at their best.",
    credentials: ["CELTA", "Certified Examiner", "MA Applied Linguistics"],
    languages: ["English", "Arabic"],
    isTopRated: true,
    sampleFeedback: {
      label: "Writing feedback excerpt",
      quote:
        "Your Task 2 argument is well-structured with a clear thesis, but the conclusion simply restates the introduction — it needs to synthesise rather than repeat. Aim to end with a broader implication or recommendation.",
    },
    reviews: [],
    photoSeed: "daniel",
  },
  {
    id: "t2",
    slug: "sarah-chen",
    name: "Dr. Sarah Chen",
    initials: "SC",
    speciality: "Writing",
    accent: "violet",
    rating: 4.9,
    reviewCount: 940,
    totalSessions: 940,
    bio: "Cambridge-certified IELTS specialist with a PhD in Applied English. Expert in Task 1 data interpretation and Task 2 argument construction.",
    longBio:
      "Dr. Sarah Chen brings a research-led approach to IELTS Writing assessment. With a PhD in Applied English and over a decade of teaching at university level, she specialises in the analytical rigour required for Band 8+ Task 1 and Task 2 responses. Her feedback pinpoints exactly where lexical and grammatical range can be elevated.",
    credentials: ["DELTA", "CELTA", "PhD Applied English"],
    languages: ["English", "Mandarin"],
    isTopRated: true,
    sampleFeedback: {
      label: "Writing feedback excerpt",
      quote:
        "Your overview in Task 1 lists data rather than synthesising the key trends. Group the most significant movements together and lead with them before detailing specific figures.",
    },
    reviews: [],
    photoSeed: "sarah",
  },
  {
    id: "t3",
    slug: "michael-torres",
    name: "Michael Torres",
    initials: "MT",
    speciality: "Speaking",
    accent: "rose",
    rating: 4.8,
    reviewCount: 760,
    totalSessions: 760,
    bio: "Licensed IELTS Speaking examiner. Creates a natural, low-pressure environment where candidates perform to their true potential.",
    longBio:
      "Michael is a licensed IELTS Speaking examiner who has assessed thousands of candidates. His sessions feel like a genuine conversation, which puts nervous candidates at ease and produces a more representative fluency score. His Part 3 questioning helps candidates stretch into more complex structures.",
    credentials: ["Licensed IELTS Examiner", "CELTA", "BA Linguistics"],
    languages: ["English", "Spanish"],
    isTopRated: false,
    sampleFeedback: {
      label: "Speaking feedback excerpt",
      quote:
        "Strong fluency and a wide range of cohesive devices. In Part 3, push for more complex conditional and passive structures to reach the top band for grammatical range.",
    },
    reviews: [],
    photoSeed: "michael",
  },
  {
    id: "t4",
    slug: "amara-okafor",
    name: "Amara Okafor",
    initials: "AO",
    speciality: "Writing & Speaking",
    accent: "sky",
    rating: 4.8,
    reviewCount: 620,
    totalSessions: 620,
    bio: "Multi-lingual examiner specialising in Academic writing assessment and holistic band scoring across all four criteria.",
    longBio:
      "Amara is a multi-lingual examiner specialising in Academic writing assessment and holistic band scoring. She is particularly skilled at helping candidates from non-European language backgrounds master the cohesion and collocation expected at Band 7+.",
    credentials: ["CELTA", "MA TESOL", "Ex-British Council"],
    languages: ["English", "French", "Hausa"],
    isTopRated: false,
    sampleFeedback: {
      label: "Writing feedback excerpt",
      quote:
        "Your ideas are sophisticated, but overused linking phrases ('Moreover', 'In addition') flatten the cohesion score. Vary your referencing and use more substitution.",
    },
    reviews: [],
    photoSeed: "amara",
  },
];

export interface MockPackage {
  id: string;
  slug: string;
  title: string;
  examType: "ACADEMIC" | "GENERAL_TRAINING";
  delivery: string;
  description: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  mostPopular?: boolean;
  skills: SkillId[];
  included: string[];
  rules: string[];
}

/** Static fallback catalog — empty when API is unreachable (no fake social proof). */
export const PACKAGES: MockPackage[] = [];

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  initials: string;
  country: string;
  band: number;
}

export const MARKETING_TESTIMONIALS: Testimonial[] = [
  { id: "1", quote: "Felt exactly like the real computer-delivered test. The examiner feedback on my writing was gold — I nailed it on the actual exam two weeks later.", name: "Maria S.", initials: "MS", country: "Brazil", band: 8 },
  { id: "2", quote: "Same-day results was a game changer. Booked my real IELTS the next morning with total confidence.", name: "Tariq Al-Amin", initials: "TA", country: "Saudi Arabia", band: 7.5 },
  { id: "3", quote: "Smooth, realistic, professional. The listening audio was indistinguishable from the real test. Worth every penny.", name: "Jai Patel", initials: "JP", country: "India", band: 7 },
  { id: "4", quote: "I'd done 5 other mock exams but none came close to this level of realism. The speaking examiner was professional and thorough.", name: "Wei Zhang", initials: "WZ", country: "China", band: 7.5 },
  { id: "5", quote: "The criteria-level feedback showed me exactly where my writing lost marks. Jumped from 7.0 to 8.5 on writing in one month.", name: "Sophie Laurent", initials: "SL", country: "France", band: 8.5 },
  { id: "6", quote: "My examiner was so thorough. The detailed written feedback is something no other platform offers at this level of depth.", name: "Ana García", initials: "AG", country: "Mexico", band: 7.5 },
];

export interface MarketingFaq {
  id: string;
  category: "The Exam" | "Results" | "Examiners" | "Technical" | "Booking" | "Practice";
  question: string;
  answer: string;
}

export const MARKETING_FAQS: MarketingFaq[] = [
  { id: "practice", category: "Practice", question: "What is the difference between a mock exam and practice packages?", answer: PRODUCT_CLAIMS.practiceVsMock },
  { id: "practice-buy", category: "Practice", question: "How do I buy practice packages?", answer: "Create a free student account, open Practice in your dashboard, and choose a package in the shop. Credits are added to your wallet after checkout — use them whenever you want on Reading, Listening, or AI Writing drills." },
  { id: "pause", category: "The Exam", question: "Can I pause or rewind during the test?", answer: "No. The exam is server-authoritative — audio plays once, timers run continuously, and there is no pause or rewind. This mirrors the computer-delivered IELTS format used on test day." },
  { id: "results", category: "Results", question: "When do I get my results?", answer: PRODUCT_CLAIMS.resultsTiming },
  { id: "examiner", category: "Examiners", question: "Can I choose my examiner?", answer: PRODUCT_CLAIMS.examinerChoice },
  { id: "devices", category: "Technical", question: "What devices are supported?", answer: "Any modern desktop or laptop browser (Chrome, Edge, Safari, Firefox). A webcam and microphone are required for the Speaking session. Mobile and tablet are not supported for exam delivery." },
  { id: "refund", category: "Booking", question: "What is the cancellation policy?", answer: LEGAL.refundPolicy },
  { id: "academic-gt", category: "The Exam", question: "Academic or General Training?", answer: `${PRODUCT_CLAIMS.academicOnlyNote} Academic is required for university admission and professional registration. General Training is for migration and work experience — Reading and Writing differ from Academic.` },
  { id: "band", category: "Results", question: "How does the band scoring work?", answer: "Each skill is scored 0–9. Listening and Reading use official band conversion tables. Writing and Speaking are graded by examiners against the four official criteria. Your Overall Band is the mean of the four, rounded to the nearest 0.5." },
  { id: "real-examiners", category: "Examiners", question: "Are examiners real IELTS-qualified professionals?", answer: "Yes. All examiners hold CELTA or higher, and most are current or former certified IELTS examiners. Every examiner is verified and calibrated before going live." },
  { id: "internet", category: "Technical", question: "What internet speed do I need?", answer: "A minimum of 5 Mbps, wired connection preferred. The Speaking session uses live video, so a stable connection is essential. We run a system check at check-in." },
  { id: "multiple", category: "Booking", question: "Can I book multiple mocks?", answer: "Yes — there is no limit. Every mock gives you fresh exam content and a new examiner selection. Your score history is tracked across all attempts so you can see your improvement over time." },
  { id: "drop", category: "Technical", question: "What happens if my internet drops during the exam?", answer: "Your section timer pauses automatically and your answers stay saved on our servers. Reconnect on any device and wait for an administrator to resume your session from the live monitor. Prolonged disconnection without resume may invalidate the session." },
  { id: "notes", category: "Results", question: "Can I see the examiner's notes after the exam?", answer: "Yes. Your Writing and Speaking examiner provides structured criteria-level written notes alongside your scores — this is the most valuable part of the report." },
];

export const INSTITUTION_COPY = {
  headline: "Mocks and practice — one platform for your students",
  subtitle:
    "Edu Centers purchase mock sets, schedule cohort mock days, and give enrolled students self-serve Reading, Listening, and AI Writing practice between test days.",
  mockEnrolments:
    "Buy B2B mock sets to unlock unlimited student enrolments on included section mocks. Schedule cohort mock days, monitor live sessions, and track every band from your centre dashboard.",
  studentPractice:
    "Students linked to your Edu Center sign in to their centre portal — My Mock for scheduled exams, Practice for subscription-style drills (Reading passages, Listening sections, question-type drills, and AI Writing reviews). They buy practice packages in the Practice shop when they need extra prep.",
  partnerApply:
    "Apply below for wholesale pricing, mock sets, and onboarding support. Email support@itestu.uz for custom cohort quotes.",
} as const;

export const PRACTICE_OFFERINGS = [
  {
    id: "reading-passages",
    title: "Reading passages",
    body: "Full passages with mixed question types — instant auto-scoring when you finish.",
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "reading-drills",
    title: "Reading question-type drills",
    body: "Focused practice on one format (matching, T/F/NG, completion, and more).",
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    id: "listening-sections",
    title: "Listening sections",
    body: "Audio sections with mixed questions — same CBT-style delivery as mocks.",
    accent: "bg-sky-50 text-sky-600",
  },
  {
    id: "listening-drills",
    title: "Listening question-type drills",
    body: "Single-format listening drills to target weak question types.",
    accent: "bg-sky-50 text-sky-700",
  },
  {
    id: "ai-writing",
    title: "AI Writing reviews",
    body: "Submit Task 2 essays and receive structured improvement feedback between mocks.",
    accent: "bg-violet-50 text-violet-600",
  },
] as const;

export const DESKTOP_COPY = {
  headline: "Optional desktop app for exam day",
  subtitle: PRODUCT_CLAIMS.desktopOptional,
} as const;

export const COPY = {
  hero: { headline1: "Sit a real IELTS mock.", headline2: "Get your real band." },
} as const;

export function bookHref(slug?: string) {
  return slug ? `/mock-exams?package=${encodeURIComponent(slug)}` : "/mock-exams";
}

/** Primary CTA label for full Academic mock — uses catalog price when available. */
export function fullMockCtaLabel(packages?: MockPackage[]): string {
  const full = packages?.find(
    (p) => p.examType === "ACADEMIC" && p.skills.length === 4,
  );
  const price = full?.price ?? SITE.fullMockPrice;
  const currency = full?.currency ?? SITE.currency;
  return `Book a Full Mock — ${formatPrice(price, currency)}`;
}
