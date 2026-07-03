import type { listPackages } from "@/lib/api/catalog";
import type { getResult, listResults } from "@/lib/api/results";
import type { getMockDayHub, getStudentProfile } from "@/lib/api/students";
import { getMockDayRules, isSingleSkillPackage } from "@/lib/exam/check-in-config";
import { packageExamSkills } from "@/lib/exam/package-skills";
import {
  fullMockHighlights,
  speakingOnlyHighlights,
  speakingTip,
  writingOnlyHighlights,
  type BrowseHighlight,
} from "@/lib/student/constants";
import {
  mockStartDateTime,
  secondsUntil,
  splitCountdown,
} from "@/lib/student/datetime";
import { fromCriteriaPayload } from "@/lib/writing/scoring";

type CatalogPackage = Awaited<ReturnType<typeof listPackages>>[number];
type MockDayApi = Awaited<ReturnType<typeof getMockDayHub>>;
type ProfileApi = Awaited<ReturnType<typeof getStudentProfile>>;
type ResultList = Awaited<ReturnType<typeof listResults>>;
type ResultDetail = Awaited<ReturnType<typeof getResult>>;

export type SkillId = "listening" | "reading" | "writing" | "speaking";
export type PartTone = "emerald" | "amber" | "rose" | "sky";
export type TimelineStatus = "completed" | "current" | "upcoming";
export type SectionStatus =
  | "completed"
  | "submitted"
  | "ready"
  | "locked"
  | "in_progress";

const SKILL_COLORS: Record<SkillId, string> = {
  listening: "#2563EB",
  reading: "#059669",
  writing: "#7C3AED",
  speaking: "#DC2626",
};

const SKILL_META: Record<
  SkillId,
  { name: string; detail: string; badge: string; color: "sky" | "emerald" | "violet" | "rose" }
> = {
  listening: {
    name: "Listening",
    detail: "40 questions · 40 min",
    badge: "Auto scored",
    color: "sky",
  },
  reading: {
    name: "Reading",
    detail: "40 questions · 60 min",
    badge: "Auto scored",
    color: "emerald",
  },
  writing: {
    name: "Writing",
    detail: "2 tasks · 60 min",
    badge: "Human graded",
    color: "violet",
  },
  speaking: {
    name: "Speaking",
    detail: "3 parts · 11–14 min",
    badge: "Live examiner",
    color: "rose",
  },
};

function formatLongDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthDay(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function bandLabel(band: number) {
  if (band >= 8) return `Band ${band} — Very Good User`;
  if (band >= 7) return `Band ${band} — Good User`;
  if (band >= 6) return `Band ${band} — Competent User`;
  return `Band ${band}`;
}

function overallFromSkills(
  skills: { skill: string; band: number | null }[],
) {
  const bands = skills.map((s) => s.band).filter((b): b is number => b != null);
  if (!bands.length) return null;
  return Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;
}

function formatExamType(examType: string) {
  switch (examType.toLowerCase()) {
    case "general_training":
      return "General Training";
    case "academic":
      return "Academic";
    default:
      return examType
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function browseDeliveryLabel(skillIds: SkillId[]): string {
  if (skillIds.length === 1 && skillIds[0] === "speaking") {
    return "Live Session";
  }
  if (skillIds.length === 1 && skillIds[0] === "writing") {
    return "Online Submission";
  }
  return "Computer-Based";
}

function browseBookCta(skillIds: SkillId[]): string {
  if (skillIds.length === 1 && skillIds[0] === "speaking") {
    return "Book Speaking Session";
  }
  if (skillIds.length === 1 && skillIds[0] === "writing") {
    return "Book Writing Mock";
  }
  return "Book Full Mock Exam";
}

function browseHighlightsFor(skillIds: SkillId[]): BrowseHighlight[] {
  if (skillIds.length === 1 && skillIds[0] === "speaking") {
    return speakingOnlyHighlights;
  }
  if (skillIds.length === 1 && skillIds[0] === "writing") {
    return writingOnlyHighlights;
  }
  return fullMockHighlights;
}

function iconForIncludedLine(line: string): BrowseHighlight["icon"] {
  const l = line.toLowerCase();
  if (
    l.includes("hour") ||
    l.includes("minute") ||
    l.includes("window") ||
    l.includes("24")
  ) {
    return "clock";
  }
  if (l.includes("examiner") || l.includes("graded") || l.includes("grading")) {
    return "user";
  }
  if (
    l.includes("band") ||
    l.includes("score") ||
    l.includes("result") ||
    l.includes("feedback") ||
    l.includes("tracking")
  ) {
    return "check";
  }
  if (
    l.includes("secure") ||
    l.includes("video") ||
    l.includes("live") ||
    l.includes("cbt") ||
    l.includes("task") ||
    l.includes("question")
  ) {
    return "globe";
  }
  return "chart";
}

function browseHighlightsFromIncluded(
  included: string[],
  skillIds: SkillId[],
): BrowseHighlight[] {
  const lines = included.map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return browseHighlightsFor(skillIds);
  return lines.slice(0, 5).map((label) => ({
    label,
    icon: iconForIncludedLine(label),
  }));
}

function normalizePackageDescription(description: string | null | undefined) {
  if (!description) return undefined;
  if (description.includes("Score + criteria feedback")) {
    return "A single live Speaking session with a certified examiner, with criteria-level feedback.";
  }
  return description;
}

function normalizeIncludedItems(items: string[]) {
  return items.map((item) => {
    switch (item) {
      case "Same-day band release":
        return "Full band report within 24 hours";
      case "Same-day score release":
        return "Speaking score within 24 hours";
      default:
        return item;
    }
  });
}

function parsePackageSkillIds(skills: unknown): SkillId[] {
  if (!Array.isArray(skills)) return [];
  const order: SkillId[] = ["listening", "reading", "writing", "speaking"];
  const found = new Set<SkillId>();
  for (const entry of skills) {
    let id: string | null = null;
    if (typeof entry === "string") id = entry.toLowerCase();
    else if (entry && typeof entry === "object" && "id" in entry) {
      id = String((entry as { id: unknown }).id).toLowerCase();
    }
    if (id && order.includes(id as SkillId)) found.add(id as SkillId);
  }
  return order.filter((id) => found.has(id));
}

function packageDescriptionFallback(skillIds: SkillId[]) {
  if (skillIds.length === 1 && skillIds[0] === "writing") {
    return "Writing tasks · 60-minute window · Human-graded by your examiner";
  }
  if (skillIds.length === 1 && skillIds[0] === "speaking") {
    return "Live speaking session · Certified examiner · Criteria feedback";
  }
  if (skillIds.length === 2) {
    return `${skillIds.length}-skill mock · Computer-delivered format`;
  }
  return "Complete 4-skill exam · Computer-delivered IELTS format · Human-graded W & S";
}

export function mapBrowseProduct(pkg: CatalogPackage) {
  const skillIds = parsePackageSkillIds(pkg.skills);
  const description =
    normalizePackageDescription(pkg.description) ??
    packageDescriptionFallback(skillIds);

  return {
    id: pkg.id,
    slug: pkg.slug,
    title: pkg.title,
    description,
    examType: formatExamType(pkg.examType),
    delivery: browseDeliveryLabel(skillIds),
    bookCta: browseBookCta(skillIds),
    skillIds,
    needsWriting: skillIds.includes("writing"),
    needsSpeaking: skillIds.includes("speaking"),
    mostPopular: pkg.mostPopular,
    rating: pkg.rating ?? 0,
    reviewCount: pkg.reviewCount,
    price: pkg.price,
    currency: pkg.currency,
    skills: skillIds.map((id) => {
      const meta = SKILL_META[id] ?? SKILL_META.listening;
      return { id, ...meta };
    }),
    included: normalizeIncludedItems(pkg.included),
    rules: pkg.rules,
    highlights: browseHighlightsFromIncluded(
      normalizeIncludedItems(pkg.included),
      skillIds,
    ),
  };
}

export type BrowseProduct = ReturnType<typeof mapBrowseProduct>;

export function mapMockDayHub(data: MockDayApi) {
  if ("missed" in data && data.missed) {
    const missed = data.missed;
    return {
      status: "missed" as const,
      enrollmentId: missed.enrollmentId,
      enrollmentCode: missed.enrollmentCode,
      packageTitle: missed.packageTitle,
      mockDateIso:
        typeof missed.mockDate === "string"
          ? missed.mockDate
          : new Date(missed.mockDate).toISOString(),
      adminGranted: missed.adminGranted,
      dateLabel: formatLongDate(new Date(missed.mockDate)),
    };
  }

  if (!data.enrollment) {
    return null;
  }

  const { enrollment, sections = [], speaking, writing } = data;
  const flexibleStart =
    Boolean(enrollment.adminGranted) && !enrollment.mockTime;
  const examStarted = Boolean(enrollment.examStartedAt);
  const hasSpeaking =
    (enrollment.packageSkills ?? []).includes("speaking") ||
    sections.some((s) => s.skill === "speaking");
  const packageSkills = packageExamSkills(enrollment.packageSkills);
  const completedCount = sections.filter((s) => s.completed).length;
  const totalModules = sections.length || packageSkills.length || 1;
  const activeSection = sections.find((s) => s.active);
  const speakingScheduled = speaking?.scheduledAt
    ? new Date(speaking.scheduledAt)
    : null;
  const needsSpeakingSlot =
    hasSpeaking && !speakingScheduled && Boolean(enrollment.speakingTeacherId);
  const mockDate = new Date(enrollment.mockDate);
  const now = Date.now();
  const checkInCompleted = Boolean(enrollment.checkInCompleted);
  const mockCutoff = enrollment.mockDayCutoffAt
    ? new Date(enrollment.mockDayCutoffAt)
    : null;
  const mockStart =
    enrollment.mockTime != null
      ? mockStartDateTime(enrollment.mockDate, enrollment.mockTime)
      : null;

  let countdownTarget: Date;
  let countdownLabel: string;
  if (examStarted || checkInCompleted) {
    countdownTarget = mockCutoff ?? mockStart ?? mockDate;
    countdownLabel = "TIME UNTIL MOCK ENDS";
  } else if (flexibleStart && mockCutoff) {
    countdownTarget = mockCutoff;
    countdownLabel = "TIME UNTIL MOCK ENDS";
  } else if (hasSpeaking && speakingScheduled) {
    countdownTarget = speakingScheduled;
    countdownLabel = "TIME UNTIL SPEAKING";
  } else if (mockStart) {
    countdownTarget = mockStart;
    countdownLabel = "TIME UNTIL MOCK START";
  } else if (mockCutoff) {
    countdownTarget = mockCutoff;
    countdownLabel = "TIME UNTIL MOCK ENDS";
  } else {
    countdownTarget = mockDate;
    countdownLabel = "TIME UNTIL MOCK START";
  }

  const secondsUntilTarget = secondsUntil(countdownTarget, now);
  const countdownParts = splitCountdown(secondsUntilTarget);
  const displayTime =
    enrollment.mockTime ??
    (mockCutoff ? formatTime(mockCutoff) : "Flexible");

  const moduleRail = sections.map((s) => {
    const skill = s.skill as SkillId;
    const meta = SKILL_META[skill];
    return {
      key: skill,
      label: meta?.name ?? s.skill,
      value: s.completed
        ? "Complete"
        : s.active
          ? "In progress"
          : speakingScheduled && skill === "speaking"
            ? formatTime(speakingScheduled)
            : "Scheduled",
      done: s.completed,
    };
  });

  const scheduleItems: {
    id: string;
    title: string;
    detail: string;
    time: string;
    status: TimelineStatus;
    isBreak: boolean;
  }[] = [
    {
      id: "checkin",
      title: "Check-in",
      detail: "Identity verification",
      time: displayTime,
      status: checkInCompleted ? "completed" : "current",
      isBreak: false,
    },
    ...sections.flatMap((s, i) => {
      const skill = s.skill as SkillId;
      const meta = SKILL_META[skill];
      const status: TimelineStatus = s.completed
        ? "completed"
        : s.active
          ? "current"
          : "upcoming";
      const items: {
        id: string;
        title: string;
        detail: string;
        time: string;
        status: TimelineStatus;
        isBreak: boolean;
      }[] = [
        {
          id: skill,
          title: meta?.name ?? s.skill,
          detail: meta?.detail.split("·")[0]?.trim() ?? "",
          time:
            skill === "speaking" && speakingScheduled
              ? formatTime(speakingScheduled)
              : displayTime,
          status,
          isBreak: false,
        },
      ];
      if (i < sections.length - 1 && s.completed) {
        items.push({
          id: `break-${skill}`,
          title: "Break",
          detail: "10 min",
          time: "",
          status: s.completed ? "completed" : "upcoming",
          isBreak: true,
        });
      }
      return items;
    }),
  ];

  type ScoreResult = { score: string; label: string };
  type StatusResult = {
    status: string;
    sub: string;
    examiner?: string;
  };

  const cbtSections: {
    id: SkillId;
    name: string;
    status: SectionStatus;
    detail: string;
    timeRange: string;
    color: string;
    result: ScoreResult | StatusResult;
  }[] = sections
    .filter((s) => s.skill !== "speaking")
    .map((s) => {
      const skill = s.skill as SkillId;
      const status: SectionStatus = s.completed
        ? "completed"
        : s.active
          ? "in_progress"
          : s.unlocked
            ? "ready"
            : "locked";
      return {
        id: skill,
        name: SKILL_META[skill]?.name ?? s.skill,
        status,
        detail: SKILL_META[skill]?.detail ?? "",
        timeRange: displayTime,
        color: SKILL_COLORS[skill] ?? "#2563EB",
        result: s.completed
          ? s.band != null
            ? { score: formatBandDisplay(coerceBand(s.band)), label: "Band score" }
            : s.rawScore != null
              ? { score: String(s.rawScore), label: "Raw score" }
              : { score: "—", label: "Complete" }
          : s.active
            ? { status: "In progress", sub: "Active now" }
            : s.unlocked
              ? {
                  status: "Ready",
                  sub: "Start when ready",
                  ...(skill === "writing" && writing?.examiner
                    ? { examiner: writing.examiner }
                    : {}),
                }
              : {
                  status: "Locked",
                  sub: checkInCompleted ? "Complete prior sections" : "Check in first",
                  ...(skill === "writing" && writing?.examiner
                    ? { examiner: writing.examiner }
                    : {}),
                },
      };
    });

  const speakingTime = speakingScheduled
    ? `${formatTime(speakingScheduled)} – ${formatTime(new Date(speakingScheduled.getTime() + 20 * 60 * 1000))}`
    : displayTime;

  return {
    status: "active" as const,
    enrollmentId: enrollment.id,
    sessionCode: enrollment.sessionCode,
    dateLabel: formatLongDate(mockDate),
    dateShort: formatMonthDay(mockDate),
    examTitle: enrollment.packageTitle ?? "Mock Exam",
    mockId: enrollment.enrollmentCode,
    mockDateIso:
      typeof enrollment.mockDate === "string"
        ? enrollment.mockDate
        : new Date(enrollment.mockDate).toISOString(),
    mockTime: enrollment.mockTime,
    mockDayCutoffAt: enrollment.mockDayCutoffAt ?? null,
    flexibleStart,
    examStarted,
    needsSpeakingSlot,
    speakingTeacherId: enrollment.speakingTeacherId ?? null,
    canReschedule: !examStarted && !checkInCompleted,
    progressPct: Math.round((completedCount / totalModules) * 100),
    modulesComplete: completedCount,
    totalModules,
    speakingExaminer: speaking?.examiner ?? "Your examiner",
    countdownLabel,
    countdown: countdownParts,
    checkInCompleted,
    currentPhase: {
      label: activeSection
        ? SKILL_META[activeSection.skill as SkillId]?.name ?? activeSection.skill
        : completedCount === totalModules
          ? "Complete"
          : checkInCompleted
            ? "Break"
            : "Check-in",
      badge: activeSection
        ? `${(activeSection.skill as string).toUpperCase()} · ACTIVE`
        : checkInCompleted
          ? "MOCK DAY · IN PROGRESS"
          : "CHECK-IN REQUIRED",
      headline: activeSection
        ? `${SKILL_META[activeSection.skill as SkillId]?.name ?? activeSection.skill} in progress`
        : completedCount === totalModules
          ? "All modules complete"
          : hasSpeaking && speakingScheduled
            ? `Speaking starts at ${formatTime(speakingScheduled)} · ${speaking?.examiner ?? "Your examiner"}`
            : checkInCompleted
              ? "Continue your mock exam"
              : flexibleStart
              ? "Start your mock anytime before the day cutoff"
              : "Complete check-in to begin",
      message: activeSection
        ? "Stay in fullscreen and follow the on-screen instructions for this section."
        : hasSpeaking && speakingScheduled
          ? "Return to this hub before your speaking slot. Ensure microphone and webcam are active."
          : checkInCompleted
            ? "Follow the schedule and complete each section in order."
            : "Verify your identity and device setup before starting your first section.",
    },
    moduleRail,
    rules: getMockDayRules(enrollment.packageSkills),
    schedule: scheduleItems,
    sections: cbtSections,
    hasSpeaking,
    speaking: {
      status: (sections.find((s) => s.skill === "speaking")?.completed
        ? "completed"
        : sections.find((s) => s.skill === "speaking")?.active
          ? "in_progress"
          : "ready") as SectionStatus,
      detail: "1-on-1 live interview · Parts 1, 2 & 3 · ~20 minutes total",
      timeRange: speakingTime,
      scheduledAt: speakingScheduled?.toISOString() ?? null,
      scheduledLabel: speakingScheduled
        ? formatTime(speakingScheduled)
        : needsSpeakingSlot
          ? "Select slot"
          : displayTime,
      examiner: speaking?.examiner ?? "Your examiner",
      examinerTitle: "Speaking Examiner · IELTS Certified",
      checklist: [
        { label: "Identity verified", done: checkInCompleted },
        { label: "Diagnostics passed", done: checkInCompleted },
        { label: "Rules acknowledged", done: checkInCompleted },
        { label: "Mic & camera ready", done: checkInCompleted },
      ],
    },
    checkIn: {
      title: checkInCompleted ? "Check-in Complete" : "Check-in Required",
      description: checkInCompleted
        ? isSingleSkillPackage(packageSkills, "writing")
          ? "You are cleared to start your Writing section."
          : isSingleSkillPackage(packageSkills, "speaking")
            ? "You are cleared to start your Speaking session."
            : "You are cleared to start your exam sections."
        : hasSpeaking && speakingScheduled
          ? `Complete before ${formatTime(new Date(speakingScheduled.getTime() - 15 * 60 * 1000))} to access the speaking session.`
          : isSingleSkillPackage(packageSkills, "writing")
            ? "Complete check-in before your Writing section."
            : isSingleSkillPackage(packageSkills, "speaking")
              ? "Complete check-in before your Speaking session."
              : "Complete check-in before your first section.",
      actionLabel: checkInCompleted ? "Review Check-in" : "Start Check-in",
    },
    speakingTip,
    state: enrollment.state,
  };
}

export type MockDaySession = NonNullable<ReturnType<typeof mapMockDayHub>>;

export type ModulePart = {
  label: string;
  sublabel: string;
  tag: string;
  tagTone: PartTone;
  value: number;
  max: number;
  unit: "raw" | "band";
};

export type ModuleDetail = {
  summary: string;
  band: number | null;
  pending: boolean;
  parts: ModulePart[];
  focus: string;
};

export type SkillResult = {
  id: SkillId;
  name: string;
  band: number | null;
  rawScore?: number | null;
  delta: number;
  pending: boolean;
};

export type AttemptRow = {
  id: string;
  date: string;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
  overallDelta?: number;
  latest?: boolean;
};

export type ProgressionPoint = {
  date: string;
  overall: number | null;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
};

export type ImprovementOpportunity = {
  rank: number;
  title: string;
  detail: string;
  priority: "High" | "Med" | "Low";
  tone: PartTone;
};

export type StudentResultsData = {
  released: boolean;
  message?: string;
  mockId: string;
  enrollmentCode: string;
  pdfUrl?: string | null;
  dateLabel: string;
  title: string;
  subtitle: string;
  examType: string;
  examFormat: string;
  overallBand: number;
  bandLabel: string;
  targetBand: number | null;
  targetAchieved: boolean;
  improvement: number;
  overallImprovement: number;
  skills: SkillResult[];
  moduleDetails: Record<SkillId, ModuleDetail>;
  scoreProgression: ProgressionPoint[];
  attempts: AttemptRow[];
  improvementOpportunities: ImprovementOpportunity[];
  targetMessage: string;
  nextSteps: string[];
  packageSkills: SkillId[];
  selectedEnrollmentCode: string;
  availableAttempts: {
    enrollmentCode: string;
    label: string;
    overallBand: number | null;
  }[];
};

function skillBand(
  skills: { skill: string; band: number | null }[] | undefined,
  skill: SkillId,
) {
  const row = skills?.find((s) => s.skill === skill);
  return coerceBand(row?.band);
}

const CRITERIA_LABELS: Record<string, string> = {
  taskAchievement: "Task Achievement",
  coherenceCohesion: "Coherence & Cohesion",
  lexicalResource: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
  fluencyCoherence: "Fluency & Coherence",
  pronunciation: "Pronunciation",
};

function prettyCriterionLabel(key: string): string {
  return CRITERIA_LABELS[key] ?? key;
}

/** Coerce API/JSON band values (number, numeric string) for display math. */
export function coerceBand(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function criterionPart(label: string, sublabel: string, value: number): ModulePart {
  return {
    label,
    sublabel,
    tag: value >= 7 ? "Strong" : value >= 6 ? "Good" : "Develop",
    tagTone: (value >= 7 ? "emerald" : value >= 6 ? "amber" : "rose") as PartTone,
    value,
    max: 9,
    unit: "band",
  };
}

const WRITING_CRITERION_KEYS: Record<string, string> = {
  taskAchievement: "Task Achievement",
  taskResponse: "Task Response",
  coherenceCohesion: "Coherence & Cohesion",
  lexicalResource: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
  taskBand: "Task band",
};

function buildCriteriaParts(
  skill: SkillId,
  criteriaScores: Record<string, unknown>,
): ModulePart[] {
  if (skill === "writing" && fromCriteriaPayload(criteriaScores)) {
    const parts: ModulePart[] = [];
    for (const [taskKey, taskLabel] of [
      ["task1", "Task 1"],
      ["task2", "Task 2"],
    ] as const) {
      const task = criteriaScores[taskKey];
      if (!task || typeof task !== "object") continue;
      for (const [key, raw] of Object.entries(task as Record<string, unknown>)) {
        if (key === "feedback") continue;
        const value = coerceBand(raw);
        if (value == null) continue;
        const label =
          key === "taskBand"
            ? `${taskLabel} overall`
            : (WRITING_CRITERION_KEYS[key] ?? prettyCriterionLabel(key));
        parts.push(criterionPart(label, taskLabel, value));
      }
    }
    return parts;
  }

  return Object.entries(criteriaScores)
    .map(([key, raw]) => {
      if (raw != null && typeof raw === "object") return null;
      const value = coerceBand(raw);
      if (value == null) return null;
      return criterionPart(prettyCriterionLabel(key), "Criterion", value);
    })
    .filter((part): part is ModulePart => part != null);
}

export function formatBandDisplay(
  band: number | string | null | undefined,
  pending = false,
): string {
  const n = coerceBand(band);
  if (n == null) return pending ? "Pending" : "—";
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function buildModuleDetail(
  skill: SkillId,
  band: number | null,
  rawScore: number | null | undefined,
  feedback?: string | null,
  criteriaScores?: Record<string, unknown>,
): ModuleDetail {
  const resolvedBand = coerceBand(band);
  const hasCriteria =
    (skill === "writing" || skill === "speaking") &&
    criteriaScores &&
    Object.keys(criteriaScores).length > 0;
  if (hasCriteria) {
    const parts = buildCriteriaParts(skill, criteriaScores);
    if (parts.length > 0) {
      return {
        summary:
          feedback ??
          (resolvedBand != null
            ? `Band ${formatBandDisplay(resolvedBand)} for ${SKILL_META[skill].name}.`
            : `${SKILL_META[skill].name} criteria scores recorded.`),
        band: resolvedBand,
        pending: resolvedBand == null,
        parts,
        focus:
          feedback ??
          `Keep practising ${SKILL_META[skill].name.toLowerCase()} under timed conditions.`,
      };
    }
  }

  const parts: ModulePart[] = [];
  const isAutoScored = skill === "listening" || skill === "reading";

  if (isAutoScored && rawScore != null) {
    parts.push({
      label: "Raw score",
      sublabel: "Correct answers",
      tag: rawScore >= 30 ? "Strong" : rawScore >= 23 ? "Good" : "Develop",
      tagTone: (rawScore >= 30 ? "emerald" : rawScore >= 23 ? "amber" : "rose") as PartTone,
      value: rawScore,
      max: 40,
      unit: "raw",
    });
  }

  if (resolvedBand != null) {
    parts.push({
      label: SKILL_META[skill].name,
      sublabel: "Band score",
      tag: resolvedBand >= 7 ? "Strong" : resolvedBand >= 6 ? "Good" : "Develop",
      tagTone: (resolvedBand >= 7 ? "emerald" : resolvedBand >= 6 ? "amber" : "rose") as PartTone,
      value: resolvedBand,
      max: 9,
      unit: "band",
    });
  }

  if (parts.length === 0) {
    return {
      summary: `${SKILL_META[skill].name} results are pending.`,
      band: null,
      pending: true,
      parts: [],
      focus: `Your ${SKILL_META[skill].name.toLowerCase()} score will appear here once grading is complete.`,
    };
  }

  return {
    summary:
      feedback ??
      (resolvedBand != null
        ? `${SKILL_META[skill].name} band score: ${formatBandDisplay(resolvedBand)}.`
        : `${SKILL_META[skill].name} raw score: ${rawScore ?? "—"}.`),
    band: resolvedBand,
    pending: resolvedBand == null,
    parts,
    focus:
      feedback ??
      `Review ${SKILL_META[skill].name.toLowerCase()} practice materials and timed drills.`,
  };
}

function deriveImprovements(
  skills: { skill: string; band: number | null }[],
  targetBand: number | null,
): ImprovementOpportunity[] {
  const goal = targetBand ?? 7;
  return skills
    .map((s) => ({ ...s, band: coerceBand(s.band) }))
    .filter((s) => s.band != null)
    .sort((a, b) => (a.band ?? 0) - (b.band ?? 0))
    .slice(0, 4)
    .map((s, i) => {
      const band = s.band ?? 0;
      const skill = s.skill as SkillId;
      return {
        rank: i + 1,
        title: `${SKILL_META[skill]?.name ?? s.skill} — Band ${band}`,
        detail: `Target Band ${goal}`,
        priority: (band < goal - 0.5 ? "High" : band < goal ? "Med" : "Low") as
          | "High"
          | "Med"
          | "Low",
        tone: (band < 6 ? "rose" : band < 7 ? "amber" : "sky") as PartTone,
      };
    });
}

export function mapPendingStudentResults(
  pending: {
    enrollmentCode: string;
    mockDate: string;
    package: string;
    message: string;
    packageSkills?: string[];
  },
  targetBand: number | null = null,
  examTypeLabel = "Academic IELTS",
): StudentResultsData {
  const packageSkills = (pending.packageSkills ?? []) as SkillId[];
  return {
    released: false,
    message: pending.message,
    mockId: pending.enrollmentCode,
    enrollmentCode: pending.enrollmentCode,
    dateLabel: formatLongDate(pending.mockDate),
    title: `${pending.package} — ${formatLongDate(pending.mockDate)}`,
    subtitle: `Mock ID: ${pending.enrollmentCode}`,
    examType: examTypeLabel,
    examFormat: examTypeLabel.includes("General")
      ? "General Training"
      : "Academic",
    overallBand: 0,
    bandLabel: "Pending",
    targetBand,
    targetAchieved: false,
    improvement: 0,
    overallImprovement: 0,
    skills: [],
    moduleDetails: {} as Record<SkillId, ModuleDetail>,
    scoreProgression: [],
    attempts: [],
    improvementOpportunities: [],
    targetMessage: "",
    nextSteps: [],
    packageSkills,
    selectedEnrollmentCode: pending.enrollmentCode,
    availableAttempts: [],
  };
}

export function mapStudentResults(
  list: ResultList,
  detailByCode: Record<string, ResultDetail>,
  selectedCode: string,
  targetBand: number | null = null,
  examTypeLabel = "Academic IELTS",
): StudentResultsData | null {
  if (!list.length) return null;

  const detail =
    detailByCode[selectedCode] ?? detailByCode[list[0]!.enrollmentCode];
  if (!detail) return null;

  if (!detail.released) {
    return {
      ...mapPendingStudentResults(
        {
          enrollmentCode: detail.enrollmentCode ?? selectedCode,
          mockDate: detail.mockDate ?? list[0]!.mockDate,
          package: detail.package ?? list[0]!.package,
          message: detail.message ?? "Results are not yet available.",
        },
        targetBand,
        examTypeLabel,
      ),
      examType: examTypeLabel,
      examFormat: examTypeLabel.includes("General")
        ? "General Training"
        : "Academic",
    };
  }

  const latest =
    list.find((item) => item.enrollmentCode === selectedCode) ?? list[0]!;
  const skillsApi = detail.skills ?? [];
  const packageSkillIds = skillsApi.map((s) => s.skill as SkillId);
  const selectedIndex = list.findIndex(
    (item) => item.enrollmentCode === selectedCode,
  );
  const previousOverall =
    selectedIndex >= 0
      ? coerceBand(list[selectedIndex + 1]?.overallBand)
      : coerceBand(list[1]?.overallBand);

  const previousDetail =
    selectedIndex >= 0
      ? detailByCode[list[selectedIndex + 1]?.enrollmentCode ?? ""]
      : undefined;
  const previousSkills = previousDetail?.skills ?? [];

  const skills: SkillResult[] = packageSkillIds.map((id) => {
    const row = skillsApi.find((s) => s.skill === id);
    const band = coerceBand(row?.band);
    const prevBand = coerceBand(
      previousSkills.find((s) => s.skill === id)?.band,
    );
    const delta =
      band != null && prevBand != null
        ? Math.round((band - prevBand) * 2) / 2
        : 0;
    return {
      id,
      name: SKILL_META[id]?.name ?? id,
      band,
      rawScore: row?.rawScore ?? null,
      delta: delta > 0 ? delta : 0,
      pending: band == null,
    };
  });

  const overallBand =
    coerceBand(detail.overallBand) ??
    coerceBand(latest.overallBand) ??
    overallFromSkills(skills.map((s) => ({ skill: s.id, band: s.band }))) ??
    0;

  const improvement =
    previousOverall != null
      ? Math.round((overallBand - previousOverall) * 2) / 2
      : 0;
  const firstOverall =
    coerceBand(list[list.length - 1]?.overallBand) ?? overallBand;
  const overallImprovement =
    Math.round((overallBand - firstOverall) * 2) / 2;

  const moduleDetails = Object.fromEntries(
    packageSkillIds.map((id) => {
      const row = skillsApi.find((s) => s.skill === id);
      return [
        id,
        buildModuleDetail(
          id,
          coerceBand(row?.band),
          row?.rawScore,
          row?.feedback,
          row?.criteriaScores as Record<string, unknown> | undefined,
        ),
      ];
    }),
  ) as Record<SkillId, ModuleDetail>;

  const chronological = [...list].reverse();
  const scoreProgression: ProgressionPoint[] = chronological.map((item) => {
    const itemDetail = detailByCode[item.enrollmentCode];
    const itemSkills = itemDetail?.skills ?? [];
    return {
      date: formatShortDate(item.mockDate),
      overall:
        coerceBand(item.overallBand) ?? coerceBand(itemDetail?.overallBand),
      listening: skillBand(itemSkills, "listening"),
      reading: skillBand(itemSkills, "reading"),
      writing: skillBand(itemSkills, "writing"),
      speaking: skillBand(itemSkills, "speaking"),
    };
  });

  const attempts: AttemptRow[] = list.map((item, index) => {
    const itemDetail = detailByCode[item.enrollmentCode];
    const itemSkills = itemDetail?.skills ?? [];
    const overall =
      coerceBand(item.overallBand) ?? coerceBand(itemDetail?.overallBand);
    const prev =
      coerceBand(list[index + 1]?.overallBand) ??
      coerceBand(detailByCode[list[index + 1]?.enrollmentCode ?? ""]?.overallBand);
    return {
      id: item.enrollmentCode,
      date: formatLongDate(item.mockDate),
      listening: skillBand(itemSkills, "listening"),
      reading: skillBand(itemSkills, "reading"),
      writing: skillBand(itemSkills, "writing"),
      speaking: skillBand(itemSkills, "speaking"),
      overall,
      overallDelta:
        overall != null && prev != null
          ? Math.round((overall - prev) * 2) / 2
          : undefined,
      latest: item.enrollmentCode === list[0]!.enrollmentCode,
    };
  });

  const targetAchieved = targetBand != null && overallBand >= targetBand;
  const moduleCount = packageSkillIds.length;

  return {
    released: true,
    mockId: detail.enrollmentCode ?? latest.enrollmentCode,
    enrollmentCode: detail.enrollmentCode ?? latest.enrollmentCode,
    pdfUrl: detail.pdfUrl ?? latest.pdfUrl ?? null,
    dateLabel: formatLongDate(detail.mockDate ?? latest.mockDate),
    title: `${detail.package ?? latest.package} — ${formatLongDate(detail.mockDate ?? latest.mockDate)}`,
    subtitle: `Mock ID: ${detail.enrollmentCode ?? latest.enrollmentCode} · ${moduleCount} module${moduleCount === 1 ? "" : "s"}`,
    examType: examTypeLabel,
    examFormat: examTypeLabel.includes("General") ? "General Training" : "Academic",
    overallBand,
    bandLabel: bandLabel(overallBand),
    targetBand,
    targetAchieved,
    improvement,
    overallImprovement,
    skills,
    moduleDetails,
    scoreProgression,
    attempts,
    improvementOpportunities: deriveImprovements(skillsApi, targetBand),
    targetMessage: targetAchieved
      ? `Excellent result. Ready to push further? Band ${(targetBand ?? overallBand) + 0.5} is within reach.`
      : `You're ${targetBand != null ? `${(targetBand - overallBand).toFixed(1)} bands` : "making progress"} from your target. Focus on your weakest module next.`,
    nextSteps: deriveImprovements(skillsApi, targetBand).map(
      (o) => `Review ${o.title.split(" — ")[0]} feedback`,
    ),
    packageSkills: packageSkillIds,
    selectedEnrollmentCode: selectedCode,
    availableAttempts: list.map((item) => ({
      enrollmentCode: item.enrollmentCode,
      label: `${item.package} · ${formatShortDate(item.mockDate)}`,
      overallBand: coerceBand(item.overallBand) ??
        coerceBand(detailByCode[item.enrollmentCode]?.overallBand) ??
        null,
    })),
  };
}

export type StudentProfileUi = {
  name: string;
  candidateType: string;
  memberSince: string;
  targetBand: number | null;
  examType: "academic" | "general_training";
  country: string | null;
  phone: string | null;
  notificationPrefs: Record<string, boolean> | null;
  contact: {
    email: string;
    location: string;
    nationality: string;
  };
  personal: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    nationality: string;
    cityCountry: string;
  };
  heroStats: {
    label: string;
    value: string;
    sub: string;
    highlight?: boolean;
  }[];
  mockPackage: {
    hasPackage: boolean;
    name: string;
    purchased: string;
    expires: string;
    orderCode: string | null;
    used: number;
    total: number;
    remainingText: string;
    inclusions: { label: string; included: boolean }[];
  };
  scoreHistory: { date: string; overall: number; writing: number }[];
  personalBests: { module: string; band: number; color: string }[];
  recentActivity: {
    id: string;
    title: string;
    sub: string;
    dot: string;
    icon: "star" | "mic" | "download" | "calendar";
  }[];
};

export function mapStudentProfile(
  api: ProfileApi,
  displayName: string,
): StudentProfileUi {
  const chronologicalHistory = [...(api?.scoreHistory ?? [])].reverse();
  const scoreHistory = chronologicalHistory.map((entry) => {
    const bands = (entry.bands ?? []).map((b) => ({
      skill: b.skill,
      band: coerceBand(b.band),
    }));
    const overall = overallFromSkills(bands) ?? 0;
    const writing = coerceBand(bands.find((b) => b.skill === "writing")?.band) ?? 0;
    return {
      date: formatShortDate(entry.date),
      overall,
      writing,
    };
  });

  const personalBests = (["listening", "reading", "writing", "speaking"] as SkillId[]).map(
    (skill) => {
      const best = (api?.scoreHistory ?? [])
        .flatMap((e) => e.bands ?? [])
        .filter((b) => b.skill === skill && b.band != null)
        .reduce((max, b) => Math.max(max, b.band ?? 0), 0);
      return {
        module: SKILL_META[skill].name,
        band: best,
        color: SKILL_COLORS[skill],
      };
    },
  );

  const bestOverall = scoreHistory.reduce(
    (max, row) => Math.max(max, row.overall),
    0,
  );
  const mocksTaken = scoreHistory.length;
  const examLabel =
    api?.examType === "general_training"
      ? "General Training IELTS Candidate"
      : "Academic IELTS Candidate";

  const recentActivity = (api?.scoreHistory ?? []).slice(0, 4).map((entry, i) => {
    const overall = overallFromSkills(entry.bands ?? []) ?? 0;
    return {
      id: `${entry.date}-${i}`,
      title: `Mock results published`,
      sub: `Band ${formatBandDisplay(overall)} — ${formatLongDate(entry.date)}`,
      dot: i === 0 ? "bg-amber-400" : "bg-gray-300",
      icon: "star" as const,
    };
  });

  const avgGainPerMock =
    scoreHistory.length > 1
      ? (scoreHistory[scoreHistory.length - 1]!.overall -
          scoreHistory[0]!.overall) /
        Math.max(scoreHistory.length - 1, 1)
      : null;

  return {
    name: displayName,
    candidateType: examLabel,
    memberSince: api?.memberSince
      ? formatLongDate(api.memberSince)
      : "Recently",
    targetBand: api?.targetBand ?? null,
    examType:
      api?.examType === "general_training" ? "general_training" : "academic",
    country: api?.country ?? null,
    phone: api?.phone ?? null,
    notificationPrefs: api?.notificationPrefs ?? null,
    contact: {
      email: api?.email ?? "",
      location: api?.country ?? "—",
      nationality: api?.country ?? "—",
    },
    personal: {
      fullName: displayName,
      email: api?.email ?? "",
      phone: api?.phone ?? "—",
      dateOfBirth: "—",
      nationality: api?.country ?? "—",
      cityCountry: api?.country ?? "—",
    },
    heroStats: [
      {
        label: "Best Band",
        value: bestOverall > 0 ? bestOverall.toFixed(1) : "—",
        sub: scoreHistory.length
          ? scoreHistory[scoreHistory.length - 1]!.date
          : "No mocks yet",
      },
      {
        label: "Mocks Taken",
        value: String(mocksTaken),
        sub: mocksTaken === 1 ? "mock completed" : "mocks completed",
      },
      {
        label: "Target Band",
        value: api?.targetBand?.toFixed(1) ?? "—",
        sub: api?.targetBand != null ? "Next goal" : "Not set yet",
      },
      {
        label: "Avg Gain",
        value:
          avgGainPerMock != null
            ? `${avgGainPerMock >= 0 ? "+" : ""}${avgGainPerMock.toFixed(1)}`
            : "—",
        sub: "per mock",
        highlight:
          avgGainPerMock != null && avgGainPerMock > 0,
      },
    ],
    mockPackage: (() => {
      const pkg = api?.package;
      const hasPackage = Boolean(pkg?.title);

      if (!hasPackage) {
        return {
          hasPackage: false,
          name: "",
          purchased: "",
          expires: "",
          orderCode: null,
          used: 0,
          total: 0,
          remainingText: "",
          inclusions: [],
        };
      }

      const used = pkg?.mocksUsed ?? mocksTaken;
      const total = Math.max(pkg?.mocksTotal ?? mocksTaken, 1);
      const remaining = Math.max(total - used, 0);
      const skillSet = new Set(
        (pkg?.skills ?? ["listening", "reading", "writing", "speaking"]).map(
          (s) => s.toLowerCase(),
        ),
      );
      return {
        hasPackage: true,
        name: pkg!.title!,
        purchased: pkg?.purchasedAt
          ? formatLongDate(pkg.purchasedAt)
          : scoreHistory.length
            ? formatLongDate(
                api!.scoreHistory[api!.scoreHistory.length - 1]!.date,
              )
            : "—",
        expires: "—",
        orderCode: pkg?.orderCode ?? null,
        used,
        total,
        remainingText:
          total > 0
            ? `${remaining} of ${total} mock${total === 1 ? "" : "s"} remaining`
            : "Book your first mock",
        inclusions: [
          { label: "Listening", included: skillSet.has("listening") },
          { label: "Reading", included: skillSet.has("reading") },
          { label: "Writing", included: skillSet.has("writing") },
          { label: "Speaking", included: skillSet.has("speaking") },
          { label: "Results", included: true },
          { label: "Certificate", included: false },
        ],
      };
    })(),
    scoreHistory,
    personalBests,
    recentActivity,
  };
}
