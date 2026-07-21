import type { MatchingInformationGroup, QuestionGroup } from "@/lib/exam/types";
import {
  DEFAULT_SECTION_LABELS,
  passageSectionLabels,
} from "@/lib/exam/passage-sections";
import {
  sectionCountWord,
  sectionLetterRange,
} from "@/lib/exam/matching-headings";

/** Default Cambridge-style matching information instruction from section letters. */
export function defaultMatchingInformationInstruction(
  sectionLetters: string[],
): string {
  const count = sectionLetters.length;
  if (count === 0) {
    return "Which section contains the following information?";
  }
  return `The text has ${sectionCountWord(count)} sections. Which section contains the following information?`;
}

export function defaultMatchingInformationHint(sectionLetters: string[]): string {
  const range = sectionLetterRange(sectionLetters);
  if (!range) return "Choose the correct section for each question.";
  return `Choose the correct section, ${range}, for each question.`;
}

export function isAutoMatchingInformationInstruction(
  instruction: string | undefined,
): boolean {
  if (!instruction?.trim()) return true;
  const trimmed = instruction.trim();
  return (
    trimmed === "Which section contains the following information?" ||
    /^The text has \w+ sections\. Which section contains the following information\?$/i.test(
      trimmed,
    )
  );
}

export function isAutoMatchingInformationHint(hint: string | undefined): boolean {
  if (!hint?.trim()) return true;
  return /^Choose the correct section(, [A-Z](?:–[A-Z])?,)? for each question\.$/i.test(
    hint.trim(),
  );
}

export function isAutoMatchingInformationSectionLabels(
  labels: string[] | undefined,
  instruction?: string,
): boolean {
  if (!labels?.length) return true;
  const normalized = labels.map((label) => label.trim().toUpperCase()).join(",");
  if (normalized === DEFAULT_SECTION_LABELS.join(",")) return true;
  if (instruction && isAutoMatchingInformationInstruction(instruction)) return true;
  return false;
}

export function patchMatchingInformationGroup(
  group: MatchingInformationGroup,
  patch: Partial<MatchingInformationGroup>,
  passageParagraphs: { marker?: string }[] | undefined,
): MatchingInformationGroup {
  const merged = { ...group, ...patch };
  const sections = passageSectionLabels(
    passageParagraphs,
    patch.sectionLabels !== undefined ? patch.sectionLabels : group.sectionLabels,
  );

  return {
    ...merged,
    instruction: isAutoMatchingInformationInstruction(merged.instruction)
      ? defaultMatchingInformationInstruction(sections)
      : merged.instruction,
    hint: isAutoMatchingInformationHint(merged.hint)
      ? defaultMatchingInformationHint(sections)
      : merged.hint,
  };
}

export function syncMatchingInformationGroupsFromPassage(
  groups: QuestionGroup[],
  passageParagraphs: { marker?: string }[] | undefined,
): QuestionGroup[] {
  const sections = passageSectionLabels(passageParagraphs);

  return groups.map((group) => {
    if (group.type !== "matching_information") return group;

    const syncLabels = isAutoMatchingInformationSectionLabels(
      group.sectionLabels,
      group.instruction,
    );

    return {
      ...group,
      instruction: isAutoMatchingInformationInstruction(group.instruction)
        ? defaultMatchingInformationInstruction(sections)
        : group.instruction,
      hint: isAutoMatchingInformationHint(group.hint)
        ? defaultMatchingInformationHint(sections)
        : group.hint,
      sectionLabels: syncLabels ? sections : group.sectionLabels,
    };
  });
}
