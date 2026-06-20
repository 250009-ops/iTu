import type { ExamSkill } from "@/lib/exam/types";
import { packageExamSkills } from "@/lib/exam/package-skills";

const SKILL_LABELS: Record<ExamSkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export type CheckInDeviceIcon =
  | "headphones"
  | "mic"
  | "camera"
  | "wifi"
  | "monitor";

export type CheckInDevice = {
  icon: CheckInDeviceIcon;
  label: string;
};

export type CheckInCopy = {
  rules: string[];
  devices: CheckInDevice[];
  subtitle: string;
  beginLabel: string;
  beginHint: string;
  deviceStepTitle: string;
};

function skillOrderLabel(skills: ExamSkill[]): string {
  return skills.map((s) => SKILL_LABELS[s]).join(" → ");
}

function isSingleSkill(skills: ExamSkill[], skill: ExamSkill): boolean {
  return skills.length === 1 && skills[0] === skill;
}

function buildMultiSkillRules(skills: ExamSkill[]): string[] {
  const rules: string[] = [
    skills.length > 1
      ? `All sections must be completed today in order: ${skillOrderLabel(skills)}.`
      : `Complete your ${SKILL_LABELS[skills[0]!]} section today.`,
    "Timers are controlled by the server. You cannot pause or rewind.",
  ];

  if (skills.includes("listening")) {
    rules.push("Audio in Listening plays once only.");
  }

  if (
    skills.some((s) => s === "listening" || s === "reading" || s === "writing")
  ) {
    rules.push("Copy and paste are disabled in all answer fields.");
  }

  rules.push("Leaving the test window is logged and may be flagged.");

  if (skills.includes("speaking") && skills.includes("writing")) {
    rules.push(
      "Your band scores are released only after Speaking is graded.",
    );
  } else if (skills.includes("writing") && !skills.includes("speaking")) {
    rules.push(
      "Your writing band score is released after your examiner completes grading — typically within 24 hours.",
    );
  } else if (
    skills.includes("listening") ||
    skills.includes("reading")
  ) {
    rules.push(
      "Listening and Reading scores are available immediately after each section.",
    );
  }

  return rules;
}

const WRITING_ONLY_RULES = [
  "Complete Task 1 and Task 2 within the 60-minute timed window.",
  "Timers are controlled by the server. You cannot pause once started.",
  "Copy and paste are disabled in all answer fields.",
  "Spell-check is disabled to mirror real exam conditions.",
  "Leaving the test window is logged and may be flagged.",
  "Your writing band score is released after your examiner completes grading — typically within 24 hours.",
];

const SPEAKING_ONLY_RULES = [
  "Complete your live Speaking session with your assigned examiner.",
  "Join on time — late arrival may shorten your session.",
  "Your microphone and webcam must work throughout the session.",
  "Speaking is recorded for examiner reference and quality assurance.",
  "Your speaking score is released within 24 hours.",
];

function buildDevices(skills: ExamSkill[]): CheckInDevice[] {
  if (isSingleSkill(skills, "writing")) {
    return [
      { icon: "wifi", label: "Stable internet connection" },
      { icon: "monitor", label: "Keyboard & display" },
    ];
  }

  if (isSingleSkill(skills, "speaking")) {
    return [
      { icon: "mic", label: "Microphone" },
      { icon: "camera", label: "Webcam" },
      { icon: "wifi", label: "Stable internet connection" },
    ];
  }

  const devices: CheckInDevice[] = [];
  if (skills.includes("listening")) {
    devices.push({ icon: "headphones", label: "Headphones" });
  }
  if (skills.includes("speaking")) {
    devices.push({ icon: "mic", label: "Microphone" });
    devices.push({ icon: "camera", label: "Webcam" });
  }
  if (devices.length === 0) {
    devices.push({ icon: "wifi", label: "Stable internet connection" });
    devices.push({ icon: "monitor", label: "Keyboard & display" });
  }
  return devices;
}

export function getCheckInCopy(skillsInput: unknown): CheckInCopy {
  const skills = packageExamSkills(skillsInput);

  if (isSingleSkill(skills, "writing")) {
    return {
      rules: WRITING_ONLY_RULES,
      devices: buildDevices(skills),
      subtitle: "Complete all three steps to unlock your Writing section.",
      beginLabel: "Begin Writing section",
      beginHint:
        "The Writing timer starts immediately when you begin. The test opens in full screen.",
      deviceStepTitle: "Device check",
    };
  }

  if (isSingleSkill(skills, "speaking")) {
    return {
      rules: SPEAKING_ONLY_RULES,
      devices: buildDevices(skills),
      subtitle: "Complete all three steps to unlock your Speaking session.",
      beginLabel: "Begin Speaking session",
      beginHint: "You will join your live Speaking room after check-in.",
      deviceStepTitle: "Device check",
    };
  }

  const first = skills[0];
  const firstLabel = first ? SKILL_LABELS[first] : "first";

  return {
    rules: skills.length > 0 ? buildMultiSkillRules(skills) : buildMultiSkillRules([
      "listening",
      "reading",
      "writing",
      "speaking",
    ]),
    devices: buildDevices(skills),
    subtitle: `Complete all three steps to unlock your ${firstLabel} section.`,
    beginLabel: first ? `Begin ${firstLabel} section` : "Begin first section",
    beginHint:
      "The test will open in full screen. Your section timer starts immediately.",
    deviceStepTitle: "Device check",
  };
}

export function getMockDayRules(skillsInput: unknown): string[] {
  const skills = packageExamSkills(skillsInput);

  if (isSingleSkill(skills, "writing")) {
    return [
      "Fullscreen required during Writing",
      "60-minute timed window",
      "Spell-check disabled",
      "Do not navigate away mid-section",
    ];
  }

  if (isSingleSkill(skills, "speaking")) {
    return [
      "Microphone & webcam required",
      "Join on time for live session",
      "Session recorded for examiner reference",
      "Do not navigate away during Speaking",
    ];
  }

  const rules = ["Fullscreen required for all sections"];
  if (skills.includes("listening")) {
    rules.push("No pause/rewind in Listening");
  }
  rules.push("All sections must be completed today");
  rules.push("Do not navigate away mid-section");
  return rules;
}

export function isSingleSkillPackage(
  skills: ExamSkill[],
  skill: ExamSkill,
): boolean {
  return skills.length === 1 && skills[0] === skill;
}
