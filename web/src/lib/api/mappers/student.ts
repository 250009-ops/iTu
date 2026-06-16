import type { listPackages } from "@/lib/api/catalog";
import type { getResult, listResults } from "@/lib/api/results";
import type { getMockDayHub, getStudentProfile } from "@/lib/api/students";
import {
  defaultExamRules,
  fullMockHighlights,
  speakingOnlyHighlights,
  speakingTip,
  writingOnlyHighlights,
  type BrowseHighlight,
} from "@/lib/student/constants";

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

export function mapBrowseProduct(pkg: CatalogPackage) {
  const skillIds = pkg.skills.map((skill) => skill.toLowerCase() as SkillId);
  const description =
    normalizePackageDescription(pkg.description) ??
    "Complete 4-skill exam · Computer-delivered IELTS format · Human-graded W & S";

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
    highlights: browseHighlightsFor(skillIds),
  };
}

export type BrowseProduct = ReturnType<typeof mapBrowseProduct>;

export function mapMockDayHub(data: MockDayApi) {
  if (!data.enrollment) {
    return null;
  }

  const { enrollment, sections = [], speaking } = data;
  const completedCount = sections.filter((s) => s.completed).length;
  const totalModules = sections.length || 4;
  const activeSection = sections.find((s) => s.active);
  const speakingScheduled = speaking?.scheduledAt
    ? new Date(speaking.scheduledAt)
    : null;
  const mockDate = new Date(enrollment.mockDate);
  const now = Date.now();
  const secondsUntilSpeaking = speakingScheduled
    ? Math.max(0, Math.floor((speakingScheduled.getTime() - now) / 1000))
    : 0;

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
      time: enrollment.mockTime,
      status: completedCount > 0 ? "completed" : "current",
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
              : enrollment.mockTime,
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
          : "locked";
      return {
        id: skill,
        name: SKILL_META[skill]?.name ?? s.skill,
        status,
        detail: SKILL_META[skill]?.detail ?? "",
        timeRange: enrollment.mockTime,
        color: SKILL_COLORS[skill] ?? "#2563EB",
        result: s.completed
          ? { score: "—", label: "Complete" }
          : s.active
            ? { status: "In progress", sub: "Active now" }
            : { status: "Locked", sub: "Not started" },
      };
    });

  const speakingTime = speakingScheduled
    ? `${formatTime(speakingScheduled)} – ${formatTime(new Date(speakingScheduled.getTime() + 20 * 60 * 1000))}`
    : enrollment.mockTime;

  return {
    enrollmentId: enrollment.id,
    sessionCode: enrollment.sessionCode,
    dateLabel: formatLongDate(mockDate),
    dateShort: formatMonthDay(mockDate),
    examTitle: "Full Academic Mock",
    mockId: enrollment.enrollmentCode,
    mockDateIso:
      typeof enrollment.mockDate === "string"
        ? enrollment.mockDate
        : new Date(enrollment.mockDate).toISOString(),
    mockTime: enrollment.mockTime,
    progressPct: Math.round((completedCount / totalModules) * 100),
    modulesComplete: completedCount,
    totalModules,
    speakingExaminer: speaking?.examiner ?? "Your examiner",
    countdown: {
      hours: Math.floor(secondsUntilSpeaking / 3600),
      minutes: Math.floor((secondsUntilSpeaking % 3600) / 60),
      seconds: secondsUntilSpeaking % 60,
    },
    currentPhase: {
      label: activeSection
        ? SKILL_META[activeSection.skill as SkillId]?.name ?? activeSection.skill
        : completedCount === totalModules
          ? "Complete"
          : "Break",
      badge: activeSection
        ? `${(activeSection.skill as string).toUpperCase()} · ACTIVE`
        : "MOCK DAY · IN PROGRESS",
      headline: activeSection
        ? `${SKILL_META[activeSection.skill as SkillId]?.name ?? activeSection.skill} in progress`
        : speakingScheduled
          ? `Speaking starts at ${formatTime(speakingScheduled)} · ${speaking?.examiner ?? "Your examiner"}`
          : "Continue your mock exam",
      message: activeSection
        ? "Stay in fullscreen and follow the on-screen instructions for this section."
        : speakingScheduled
          ? "Return to this hub before your speaking slot. Ensure microphone and webcam are active."
          : "Follow the schedule and complete each section in order.",
    },
    moduleRail,
    rules: defaultExamRules,
    schedule: scheduleItems,
    sections: cbtSections,
    speaking: {
      status: (sections.find((s) => s.skill === "speaking")?.completed
        ? "completed"
        : sections.find((s) => s.skill === "speaking")?.active
          ? "in_progress"
          : "ready") as SectionStatus,
      detail: "1-on-1 live interview · Parts 1, 2 & 3 · ~20 minutes total",
      timeRange: speakingTime,
      scheduledLabel: speakingScheduled
        ? formatTime(speakingScheduled)
        : enrollment.mockTime,
      examiner: speaking?.examiner ?? "Your examiner",
      examinerTitle: "Speaking Examiner · IELTS Certified",
      checklist: [
        { label: "Identity verified", done: completedCount > 0 },
        { label: "Diagnostics passed", done: completedCount > 0 },
        { label: "Rules acknowledged", done: completedCount > 0 },
        { label: "Mic & camera ready", done: true },
      ],
    },
    checkIn: {
      title: "Check-in Required",
      description: speakingScheduled
        ? `Complete before ${formatTime(new Date(speakingScheduled.getTime() - 15 * 60 * 1000))} to access the speaking session.`
        : "Complete check-in before your first section.",
      actionLabel: "Start Check-in",
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
  band: number;
  parts: ModulePart[];
  focus: string;
};

export type SkillResult = {
  id: SkillId;
  name: string;
  band: number;
  delta: number;
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
  overall: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
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
};

function skillBand(
  skills: { skill: string; band: number | null }[] | undefined,
  skill: SkillId,
) {
  return skills?.find((s) => s.skill === skill)?.band ?? null;
}

function buildModuleDetail(
  skill: SkillId,
  band: number | null,
  feedback?: string | null,
  criteriaScores?: Record<string, number>,
): ModuleDetail {
  const safeBand = band ?? 0;
  const isRaw = skill === "listening" || skill === "reading";

  if (criteriaScores && Object.keys(criteriaScores).length > 0) {
    const parts = Object.entries(criteriaScores).map(([label, value]) => ({
      label,
      sublabel: "Criterion",
      tag: value >= 7 ? "Strong" : value >= 6 ? "Good" : "Develop",
      tagTone: (value >= 7 ? "emerald" : value >= 6 ? "amber" : "rose") as PartTone,
      value,
      max: 9,
      unit: "band" as const,
    }));
    return {
      summary: feedback ?? `Band ${safeBand} for ${SKILL_META[skill].name}.`,
      band: safeBand,
      parts,
      focus: feedback ?? `Keep practising ${SKILL_META[skill].name.toLowerCase()} under timed conditions.`,
    };
  }

  return {
    summary:
      feedback ??
      `${SKILL_META[skill].name} band score: ${safeBand || "pending"}.`,
    band: safeBand,
    parts: [
      {
        label: SKILL_META[skill].name,
        sublabel: isRaw ? "Raw score" : "Band score",
        tag: safeBand >= 7 ? "Strong" : safeBand >= 6 ? "Good" : "Develop",
        tagTone: (safeBand >= 7 ? "emerald" : safeBand >= 6 ? "amber" : "rose") as PartTone,
        value: safeBand,
        max: isRaw ? 40 : 9,
        unit: isRaw ? "raw" : "band",
      },
    ],
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
  },
  targetBand: number | null = null,
): StudentResultsData {
  return {
    released: false,
    message: pending.message,
    mockId: pending.enrollmentCode,
    enrollmentCode: pending.enrollmentCode,
    dateLabel: formatLongDate(pending.mockDate),
    title: `${pending.package} — ${formatLongDate(pending.mockDate)}`,
    subtitle: `Mock ID: ${pending.enrollmentCode}`,
    examType: "Academic IELTS",
    examFormat: "Academic",
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
  };
}

export function mapStudentResults(
  list: ResultList,
  detail: ResultDetail,
  targetBand: number | null = null,
): StudentResultsData | null {
  if (!list.length) return null;

  if (!detail.released) {
    return {
      released: false,
      message: detail.message ?? "Results are not yet available.",
      mockId: detail.enrollmentCode ?? list[0]?.enrollmentCode ?? "",
      enrollmentCode: detail.enrollmentCode ?? list[0]?.enrollmentCode ?? "",
      dateLabel: formatLongDate(detail.mockDate ?? list[0]?.mockDate ?? ""),
      title: `${detail.package ?? list[0]?.package ?? "Mock"} — ${formatLongDate(detail.mockDate ?? list[0]?.mockDate ?? "")}`,
      subtitle: `Mock ID: ${detail.enrollmentCode ?? list[0]?.enrollmentCode ?? ""}`,
      examType: "Academic IELTS",
      examFormat: "Academic",
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
    };
  }

  const latest = list[0];
  const skillsApi = detail.skills ?? [];
  const overallBand = detail.overallBand ?? latest.overallBand ?? 0;
  const previousOverall = list[1]?.overallBand ?? null;
  const improvement =
    previousOverall != null
      ? Math.round((overallBand - previousOverall) * 2) / 2
      : 0;
  const firstOverall = list[list.length - 1]?.overallBand ?? overallBand;
  const overallImprovement =
    Math.round((overallBand - firstOverall) * 2) / 2;

  const skills: SkillResult[] = (["listening", "reading", "writing", "speaking"] as SkillId[]).map(
    (id) => {
      const current = skillBand(skillsApi, id) ?? 0;
      return {
        id,
        name: SKILL_META[id].name,
        band: current,
        delta: 0,
      };
    },
  );

  const moduleDetails = Object.fromEntries(
    (["listening", "reading", "writing", "speaking"] as SkillId[]).map((id) => {
      const row = skillsApi.find((s) => s.skill === id);
      return [
        id,
        buildModuleDetail(id, row?.band ?? null, row?.feedback, row?.criteriaScores),
      ];
    }),
  ) as Record<SkillId, ModuleDetail>;

  const chronological = [...list].reverse();
  const scoreProgression: ProgressionPoint[] = chronological.map((item, index) => {
    const isLatest = index === chronological.length - 1;
    const itemSkills = isLatest ? skillsApi : [];
    return {
      date: formatShortDate(item.mockDate),
      overall: item.overallBand ?? 0,
      listening: skillBand(itemSkills, "listening") ?? item.overallBand ?? 0,
      reading: skillBand(itemSkills, "reading") ?? item.overallBand ?? 0,
      writing: skillBand(itemSkills, "writing") ?? item.overallBand ?? 0,
      speaking: skillBand(itemSkills, "speaking") ?? item.overallBand ?? 0,
    };
  });

  const attempts: AttemptRow[] = list.map((item, index) => {
    const isLatest = index === 0;
    const itemSkills = isLatest ? skillsApi : [];
    const overall = item.overallBand;
    const prev = list[index + 1]?.overallBand;
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
      latest: isLatest,
    };
  });

  const targetAchieved =
    targetBand != null && overallBand >= targetBand;

  return {
    released: true,
    mockId: detail.enrollmentCode ?? latest.enrollmentCode,
    enrollmentCode: detail.enrollmentCode ?? latest.enrollmentCode,
    pdfUrl: detail.pdfUrl ?? latest.pdfUrl ?? null,
    dateLabel: formatLongDate(detail.mockDate ?? latest.mockDate),
    title: `${detail.package ?? latest.package} — ${formatLongDate(detail.mockDate ?? latest.mockDate)}`,
    subtitle: `Mock ID: ${detail.enrollmentCode ?? latest.enrollmentCode} · IDP Computer-delivered format · All 4 modules`,
    examType: "Academic IELTS",
    examFormat: "Academic",
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
  const scoreHistory = (api?.scoreHistory ?? []).map((entry) => {
    const bands = entry.bands ?? [];
    const overall = overallFromSkills(bands) ?? 0;
    const writing = bands.find((b) => b.skill === "writing")?.band ?? 0;
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
      title: `Mock results published`,
      sub: `Band ${overall} — ${formatLongDate(entry.date)}`,
      dot: i === 0 ? "bg-amber-400" : "bg-gray-300",
      icon: "star" as const,
    };
  });

  return {
    name: displayName,
    candidateType: examLabel,
    memberSince: scoreHistory.length
      ? formatLongDate(api!.scoreHistory[api!.scoreHistory.length - 1]!.date)
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
        sub: scoreHistory[0] ? scoreHistory[0].date : "No mocks yet",
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
          scoreHistory.length > 1
            ? `+${(
                (scoreHistory[scoreHistory.length - 1]!.overall -
                  scoreHistory[0]!.overall) /
                Math.max(scoreHistory.length - 1, 1)
              ).toFixed(1)}`
            : "—",
        sub: "per mock",
        highlight: scoreHistory.length > 1,
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
