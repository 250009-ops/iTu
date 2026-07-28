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

/** Day-first exam date for attempt pickers, e.g. "26 Jul 2026". */
function formatAttemptDateLabel(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function skillSummaryLabel(skills: SkillId[]): string {
  if (skills.length === 0) return "Mock";
  if (skills.length >= 4) return "Full";
  if (skills.length === 1) return SKILL_META[skills[0]]?.name ?? skills[0];
  return skills.map((id) => SKILL_META[id]?.name ?? id).join(" · ");
}

function formatMonthDay(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tashkent",
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
  if (skillIds.length === 1 && skillIds[0] === "listening") {
    return "Book Listening Mock";
  }
  if (skillIds.length === 1 && skillIds[0] === "reading") {
    return "Book Reading Mock";
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

export type BrowseOffer = {
  tabId: string;
  label: string;
  product: BrowseProduct | null;
  activeEnrollment: {
    enrollmentCode: string;
    mockDateLabel: string;
    mockTime: string | null;
    packageTitle: string;
  } | null;
};

export function mapBrowseOffer(offer: {
  tabId: string;
  label: string;
  displayTitle: string;
  package: CatalogPackage | null;
  activeEnrollment?: {
    enrollmentCode: string;
    mockDate: string;
    mockTime: string | null;
    packageTitle: string;
  } | null;
}): BrowseOffer {
  return {
    tabId: offer.tabId,
    label: offer.label,
    product: offer.package
      ? mapBrowseProduct({ ...offer.package, title: offer.displayTitle })
      : null,
    activeEnrollment: offer.activeEnrollment
      ? {
          enrollmentCode: offer.activeEnrollment.enrollmentCode,
          mockDateLabel: formatLongDate(new Date(offer.activeEnrollment.mockDate)),
          mockTime: offer.activeEnrollment.mockTime,
          packageTitle: offer.activeEnrollment.packageTitle,
        }
      : null,
  };
}

export function mapMockDayHub(data: MockDayApi) {
  if (!data.enrollment) {
    return null;
  }

  const { enrollment, sections = [], speaking, writing } = data;
  const isMissed = enrollment.status === "missed";
  const isAwaitingResults = enrollment.status === "awaiting_results";
  const flexibleStart =
    (Boolean(enrollment.adminGranted) ||
      Boolean(enrollment.institutionGranted)) &&
    !enrollment.mockTime;
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
  const institutionGranted = Boolean(enrollment.institutionGranted);
  const canScheduleSpeakingSlot = needsSpeakingSlot && !institutionGranted;
  const speakingSessionCode =
    speaking?.sessionCode ?? enrollment.sessionCode;
  const speakingEnrollmentId =
    speaking?.enrollmentId ?? enrollment.id;
  const speakingCheckInCompleted =
    speaking?.checkInCompleted ?? Boolean(enrollment.checkInCompleted);
  /** Reschedule targets the primary enrollment only — speaking slot only if that package includes speaking. */
  const rescheduleHasSpeaking =
    enrollment.rescheduleHasSpeaking ?? hasSpeaking;
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
  const mockDayClosed =
    isMissed ||
    (!examStarted &&
      !checkInCompleted &&
      mockCutoff != null &&
      now > mockCutoff.getTime());
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
      sessionCode: s.sessionCode ?? enrollment.sessionCode,
      enrollmentId: s.enrollmentId ?? enrollment.id,
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
    sessionCode: string;
    enrollmentId: string;
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
        sessionCode: s.sessionCode ?? enrollment.sessionCode,
        enrollmentId: s.enrollmentId ?? enrollment.id,
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
    status: isMissed
      ? ("missed" as const)
      : isAwaitingResults
        ? ("awaiting_results" as const)
        : ("active" as const),
    enrollmentId: enrollment.id,
    speakingEnrollmentId,
    sessionCode: enrollment.sessionCode,
    speakingSessionCode,
    rescheduleHasSpeaking,
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
    canScheduleSpeakingSlot,
    institutionGranted,
    speakingTeacherId: enrollment.speakingTeacherId ?? null,
    canReschedule:
      !isMissed &&
      !isAwaitingResults &&
      !mockDayClosed &&
      !enrollment.rescheduleBlocked &&
      !examStarted &&
      !checkInCompleted,
    progressPct: Math.round((completedCount / totalModules) * 100),
    modulesComplete: completedCount,
    totalModules,
    speakingExaminer: speaking?.examiner ?? "Your examiner",
    countdownLabel,
    countdown: countdownParts,
    checkInCompleted,
    mockDayClosed,
    currentPhase: {
      label: isMissed
        ? "Missed"
        : isAwaitingResults
          ? "Awaiting results"
          : mockDayClosed
            ? "Window closed"
            : activeSection
              ? SKILL_META[activeSection.skill as SkillId]?.name ?? activeSection.skill
              : completedCount === totalModules
                ? "Complete"
                : checkInCompleted
                  ? "Break"
                  : "Check-in",
      badge: isMissed
        ? "MOCK DAY · MISSED"
        : isAwaitingResults
          ? "MOCK DAY · AWAITING RESULTS"
          : mockDayClosed
            ? "MOCK DAY · CLOSED"
            : activeSection
              ? `${(activeSection.skill as string).toUpperCase()} · ACTIVE`
              : checkInCompleted
                ? "MOCK DAY · IN PROGRESS"
                : "CHECK-IN REQUIRED",
      headline: isMissed
        ? enrollment.examStartedAt
          ? "Speaking marked absent"
          : "Mock day missed"
        : isAwaitingResults
          ? "All exam sections submitted"
          : mockDayClosed
            ? "The mock day window has closed"
            : activeSection
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
      message: isMissed
        ? enrollment.examStartedAt
          ? institutionGranted
            ? "You were marked absent after missing the speaking late-join window. Contact your centre admin to reappoint."
            : "You were marked absent after missing the speaking late-join window. Contact your centre admin to reappoint, or book a new mock from Browse."
          : institutionGranted
            ? "This session was marked missed. Contact your centre admin to reappoint."
            : "This session was marked missed. Contact your centre admin to reappoint, or book a new mock from Browse."
        : isAwaitingResults
          ? "Your answers are with examiners for grading. Band scores appear on Results once Writing and Speaking are graded — typically within 24 hours."
          : mockDayClosed
            ? "You did not start before the day cutoff. Check your dashboard for next steps."
            : activeSection
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
      status: (isMissed ||
      mockDayClosed ||
      speaking?.missed ||
      sections.find((s) => s.skill === "speaking")?.missed
        ? "locked"
        : sections.find((s) => s.skill === "speaking")?.completed
          ? "completed"
          : sections.find((s) => s.skill === "speaking")?.active
            ? "in_progress"
            : "ready") as SectionStatus,
      detail: "1-on-1 live interview · Parts 1, 2 & 3 · ~20 minutes total",
      timeRange: speakingTime,
      scheduledAt: speakingScheduled?.toISOString() ?? null,
      scheduledLabel: speakingScheduled
        ? formatTime(speakingScheduled)
        : speaking?.missed ||
            sections.find((s) => s.skill === "speaking")?.missed
          ? "Missed"
          : needsSpeakingSlot
            ? institutionGranted
              ? "Awaiting centre"
              : "Select slot"
            : displayTime,
      examiner: speaking?.examiner ?? "Your examiner",
      examinerTitle: "Speaking Examiner · IELTS Certified",
      checklist: [
        { label: "Identity verified", done: speakingCheckInCompleted },
        { label: "Diagnostics passed", done: speakingCheckInCompleted },
        { label: "Rules acknowledged", done: speakingCheckInCompleted },
        { label: "Mic & camera ready", done: speakingCheckInCompleted },
      ],
      missed: Boolean(
        speaking?.missed ||
          sections.find((s) => s.skill === "speaking")?.missed,
      ),
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

export type WritingTaskDetail = {
  band: number | null;
  feedback?: string;
  parts: ModulePart[];
};

export type ModuleDetail = {
  summary: string;
  band: number | null;
  pending: boolean;
  parts: ModulePart[];
  focus: string;
  writingTasks?: {
    task1: WritingTaskDetail;
    task2: WritingTaskDetail;
  };
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
  /** Short skill/module label for the attempt, e.g. "Reading", "Full". */
  skillSummary: string;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
  overallDelta?: number;
  latest?: boolean;
  /** True when some modules are scored but the full report is not released. */
  partial?: boolean;
  /** True when the full report (PDF/certificate) is available. */
  released?: boolean;
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
  /** True when some modules are graded but the full report is not released yet. */
  partial?: boolean;
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
    /** Date-first composed label, e.g. "26 Jul 2026 · Reading". */
    label: string;
    /** Exam/mock date, e.g. "26 Jul 2026". */
    dateLabel: string;
    /** Short skill/module summary, e.g. "Reading", "Writing", "Full". */
    skillSummary: string;
    overallBand: number | null;
    /** True when some modules are scored but the full report is not released. */
    partial?: boolean;
  }[];
  certificate: CertificateData;
};

export type CertificateData = {
  candidateName: string;
  candidateEmail: string | null;
  country: string | null;
  /** ISO date string from profile. */
  dateOfBirth: string | null;
  sex: string | null;
  firstLanguage: string | null;
  schemeCode: string;
  /** "Academic" | "General Training" module label. */
  moduleLabel: string;
  /** ISO mock exam date. */
  mockDate: string | null;
  /** ISO results issue date. */
  issueDate: string | null;
  /** The partner centre that conducted the exam, or null for direct iTestU. */
  centre: {
    name: string;
    logoUrl: string | null;
    city: string | null;
    code?: string | null;
  } | null;
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

const WRITING_TASK1_CRITERION_ORDER = [
  "taskAchievement",
  "coherenceCohesion",
  "lexicalResource",
  "grammar",
] as const;

const WRITING_TASK2_CRITERION_ORDER = [
  "taskResponse",
  "coherenceCohesion",
  "lexicalResource",
  "grammar",
] as const;

const SPEAKING_CRITERION_ORDER = [
  "fluencyCoherence",
  "lexicalResource",
  "grammar",
  "pronunciation",
] as const;

function buildWritingTaskParts(
  taskKey: "task1" | "task2",
  task: Record<string, unknown>,
): ModulePart[] {
  const order =
    taskKey === "task1"
      ? WRITING_TASK1_CRITERION_ORDER
      : WRITING_TASK2_CRITERION_ORDER;
  const parts: ModulePart[] = [];
  for (const key of order) {
    const value = coerceBand(task[key]);
    if (value == null) continue;
    const label = WRITING_CRITERION_KEYS[key] ?? prettyCriterionLabel(key);
    parts.push(criterionPart(label, "Criterion", value));
  }
  return parts;
}

function buildWritingTasks(
  criteriaScores: Record<string, unknown>,
): ModuleDetail["writingTasks"] | null {
  if (!fromCriteriaPayload(criteriaScores)) return null;

  const task1Raw = criteriaScores.task1;
  const task2Raw = criteriaScores.task2;
  if (!task1Raw || typeof task1Raw !== "object" || !task2Raw || typeof task2Raw !== "object") {
    return null;
  }

  const task1 = task1Raw as Record<string, unknown>;
  const task2 = task2Raw as Record<string, unknown>;
  const task1Parts = buildWritingTaskParts("task1", task1);
  const task2Parts = buildWritingTaskParts("task2", task2);
  if (task1Parts.length === 0 && task2Parts.length === 0) return null;

  const task1Feedback =
    typeof task1.feedback === "string" && task1.feedback.trim()
      ? task1.feedback.trim()
      : undefined;
  const task2Feedback =
    typeof task2.feedback === "string" && task2.feedback.trim()
      ? task2.feedback.trim()
      : undefined;

  return {
    task1: {
      band: coerceBand(task1.taskBand),
      feedback: task1Feedback,
      parts: task1Parts,
    },
    task2: {
      band: coerceBand(task2.taskBand),
      feedback: task2Feedback,
      parts: task2Parts,
    },
  };
}

function buildCriteriaParts(
  skill: SkillId,
  criteriaScores: Record<string, unknown>,
): ModulePart[] {
  if (skill === "writing") return [];

  if (skill === "speaking") {
    const parts: ModulePart[] = [];
    for (const key of SPEAKING_CRITERION_ORDER) {
      const value = coerceBand(criteriaScores[key]);
      if (value == null) continue;
      parts.push(criterionPart(prettyCriterionLabel(key), "Criterion", value));
    }
    if (parts.length > 0) return parts;
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
    if (skill === "writing") {
      const writingTasks = buildWritingTasks(criteriaScores);
      if (writingTasks) {
        return {
          summary:
            feedback ??
            (resolvedBand != null
              ? `Band ${formatBandDisplay(resolvedBand)} for ${SKILL_META[skill].name}.`
              : `${SKILL_META[skill].name} criteria scores recorded.`),
          band: resolvedBand,
          pending: resolvedBand == null,
          parts: [],
          writingTasks,
          focus:
            feedback ??
            `Keep practising ${SKILL_META[skill].name.toLowerCase()} under timed conditions.`,
        };
      }
    }

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
    certificate: {
      candidateName: "Candidate",
      candidateEmail: null,
      country: null,
      dateOfBirth: null,
      sex: null,
      firstLanguage: null,
      schemeCode: "Mock Candidate",
      moduleLabel: examTypeLabel.includes("General")
        ? "General Training"
        : "Academic",
      mockDate: pending.mockDate,
      issueDate: null,
      centre: null,
    },
  };
}

export function mapStudentResults(
  list: ResultList,
  detailByCode: Record<string, ResultDetail>,
  selectedCode: string,
  targetBand: number | null = null,
  examTypeLabel = "Academic IELTS",
): StudentResultsData | null {
  const detail =
    detailByCode[selectedCode] ??
    (list[0] ? detailByCode[list[0].enrollmentCode] : undefined);
  if (!detail) return null;

  const hasSkillScores = (detail.skills ?? []).some((s) => s.band != null);
  const showScores = detail.released || detail.partial || hasSkillScores;

  if (!showScores) {
    if (!list.length && !detail.enrollmentCode) return null;
    return {
      ...mapPendingStudentResults(
        {
          enrollmentCode: detail.enrollmentCode ?? selectedCode,
          mockDate: detail.mockDate ?? list[0]?.mockDate ?? new Date().toISOString(),
          package: detail.package ?? list[0]?.package ?? "Mock",
          message: detail.message ?? "Results are not yet available.",
          packageSkills: detail.packageSkills,
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
    list.find((item) => item.enrollmentCode === selectedCode) ?? list[0];
  const skillsApi = detail.skills ?? [];
  const packageSkillIds = (
    detail.packageSkills?.length
      ? detail.packageSkills
      : skillsApi.map((s) => s.skill)
  ) as SkillId[];
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
    coerceBand(latest?.overallBand) ??
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
    const itemSkillsApi = itemDetail?.skills ?? [];
    const attemptSkillIds = packageExamSkills(
      itemDetail?.packageSkills?.length
        ? itemDetail.packageSkills
        : itemSkillsApi.map((s) => s.skill),
    ) as SkillId[];
    const itemReleased =
      !!itemDetail?.released || item.resultsStatus === "released";
    const itemHasScores =
      itemSkillsApi.some((s) => coerceBand(s.band) != null) ||
      coerceBand(item.overallBand) != null;
    const itemPartial =
      !itemReleased &&
      (!!itemDetail?.partial ||
        item.resultsStatus === "partial" ||
        itemHasScores);
    const overall =
      coerceBand(item.overallBand) ?? coerceBand(itemDetail?.overallBand);
    const prev =
      coerceBand(list[index + 1]?.overallBand) ??
      coerceBand(detailByCode[list[index + 1]?.enrollmentCode ?? ""]?.overallBand);
    return {
      id: item.enrollmentCode,
      date: formatLongDate(item.mockDate),
      skillSummary: skillSummaryLabel(attemptSkillIds),
      listening: skillBand(itemSkillsApi, "listening"),
      reading: skillBand(itemSkillsApi, "reading"),
      writing: skillBand(itemSkillsApi, "writing"),
      speaking: skillBand(itemSkillsApi, "speaking"),
      overall,
      overallDelta:
        overall != null && prev != null
          ? Math.round((overall - prev) * 2) / 2
          : undefined,
      latest: item.enrollmentCode === (list[0]?.enrollmentCode ?? selectedCode),
      released: itemReleased,
      partial: itemPartial,
    };
  });

  const isPartial = !detail.released && showScores;
  // Don't celebrate a target on an incomplete overall — wait for full release.
  const targetAchieved =
    !isPartial && targetBand != null && overallBand >= targetBand;
  const moduleCount = packageSkillIds.length;
  const enrollmentCode =
    detail.enrollmentCode ?? latest?.enrollmentCode ?? selectedCode;
  const mockDate = detail.mockDate ?? latest?.mockDate ?? new Date().toISOString();
  const packageTitle = detail.package ?? latest?.package ?? "Mock";
  const scoredCount = skills.filter((s) => s.band != null).length;

  return {
    released: !!detail.released,
    partial: isPartial,
    message: detail.message,
    mockId: enrollmentCode,
    enrollmentCode,
    pdfUrl: detail.pdfUrl ?? latest?.pdfUrl ?? null,
    dateLabel: formatLongDate(mockDate),
    title: `${packageTitle} — ${formatLongDate(mockDate)}`,
    subtitle: isPartial
      ? `Mock ID: ${enrollmentCode} · ${scoredCount}/${moduleCount} modules scored`
      : `Mock ID: ${enrollmentCode} · ${moduleCount} module${moduleCount === 1 ? "" : "s"}`,
    examType: examTypeLabel,
    examFormat: examTypeLabel.includes("General") ? "General Training" : "Academic",
    overallBand,
    bandLabel: isPartial
      ? scoredCount > 0
        ? `Partial overall — Band ${formatBandDisplay(overallBand)}`
        : "Partial results"
      : bandLabel(overallBand),
    targetBand,
    targetAchieved,
    improvement: isPartial ? 0 : improvement,
    overallImprovement: isPartial ? 0 : overallImprovement,
    skills,
    moduleDetails,
    scoreProgression,
    attempts,
    improvementOpportunities: deriveImprovements(skillsApi, targetBand),
    targetMessage: targetAchieved
      ? `Excellent result. Ready to push further? Band ${(targetBand ?? overallBand) + 0.5} is within reach.`
      : isPartial
        ? detail.message ??
          `Some modules are graded. Full overall unlocks when all ${moduleCount} modules are complete.`
        : `You're ${targetBand != null ? `${(targetBand - overallBand).toFixed(1)} bands` : "making progress"} from your target. Focus on your weakest module next.`,
    nextSteps: deriveImprovements(skillsApi, targetBand).map(
      (o) => `Review ${o.title.split(" — ")[0]} feedback`,
    ),
    packageSkills: packageSkillIds,
    selectedEnrollmentCode: selectedCode,
    availableAttempts: list.map((item) => {
      const itemDetail = detailByCode[item.enrollmentCode];
      const itemSkills = packageExamSkills(
        itemDetail?.packageSkills?.length
          ? itemDetail.packageSkills
          : (itemDetail?.skills ?? []).map((s) => s.skill),
      ) as SkillId[];
      const dateLabel = formatAttemptDateLabel(item.mockDate);
      const skillSummary = skillSummaryLabel(itemSkills);
      const itemReleased =
        !!itemDetail?.released || item.resultsStatus === "released";
      const itemHasScores =
        (itemDetail?.skills ?? []).some((s) => coerceBand(s.band) != null) ||
        coerceBand(item.overallBand) != null;
      const itemPartial =
        !itemReleased &&
        (!!itemDetail?.partial ||
          item.resultsStatus === "partial" ||
          itemHasScores);
      const overallBand =
        coerceBand(item.overallBand) ??
        coerceBand(itemDetail?.overallBand) ??
        null;
      return {
        enrollmentCode: item.enrollmentCode,
        dateLabel,
        skillSummary,
        label: `${dateLabel} · ${skillSummary}`,
        overallBand,
        partial: itemPartial,
      };
    }),
    certificate: {
      candidateName: detail.candidateName ?? "Candidate",
      candidateEmail: detail.candidateEmail ?? null,
      country: detail.country ?? null,
      dateOfBirth: detail.dateOfBirth ?? null,
      sex: detail.sex ?? null,
      firstLanguage: detail.firstLanguage ?? null,
      schemeCode: detail.schemeCode ?? (detail.centre ? "Partner Candidate" : "Mock Candidate"),
      moduleLabel: (detail.candidateExamType ?? "")
        .toUpperCase()
        .includes("GENERAL")
        ? "General Training"
        : "Academic",
      mockDate: detail.mockDate ?? latest?.mockDate ?? null,
      issueDate: detail.issueDate ?? detail.mockDate ?? latest?.mockDate ?? null,
      centre: detail.centre ?? null,
    },
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
  dateOfBirthRaw: string | null;
  sex: string | null;
  firstLanguage: string | null;
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
    sex: string;
    firstLanguage: string;
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
    dateOfBirthRaw: api?.dateOfBirth ?? null,
    sex: api?.sex ?? null,
    firstLanguage: api?.firstLanguage ?? null,
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
      dateOfBirth: api?.dateOfBirth ? formatLongDate(api.dateOfBirth) : "—",
      sex: api?.sex ?? "—",
      firstLanguage: api?.firstLanguage ?? "—",
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
      const total = pkg?.mocksTotal ?? mocksTaken;
      const remaining =
        pkg?.mocksRemaining ?? Math.max(total - used, 0);
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
          remaining > 0
            ? `${remaining} of ${total} mock${total === 1 ? "" : "s"} remaining`
            : used >= total && total > 0
              ? "All mocks completed"
              : total > 0
                ? "No active mocks scheduled"
                : "Book your first mock",
        inclusions: [
          { label: "Listening", included: skillSet.has("listening") },
          { label: "Reading", included: skillSet.has("reading") },
          { label: "Writing", included: skillSet.has("writing") },
          { label: "Speaking", included: skillSet.has("speaking") },
          { label: "Results", included: true },
        ],
      };
    })(),
    scoreHistory,
    personalBests,
    recentActivity,
  };
}
