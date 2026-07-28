"use client";

import { X } from "lucide-react";
import type { AnswerMap, MatchingGroup, QuestionGroup, ReadingPassage } from "@/lib/exam/types";
import {
  headingLabel,
  matchingHeadingsForPassage,
  sectionQuestionMap,
} from "@/lib/exam/matching-headings";
import { useReadingHeadings } from "@/components/exam/reading/reading-headings-context";
import { isHtmlContent, sanitizePassageHtml } from "@/lib/admin/content/sanitize-html";
import { passageSectionLabels } from "@/lib/exam/passage-sections";
import {
  marksForParagraph,
  splitMarkedText,
  type ReadingMark,
} from "@/lib/exam/reading-marks";
import { PASSAGE_FONT_STYLE } from "@/lib/exam/typography";
import {
  textSizeProps,
  type TextSize,
} from "@/lib/exam/use-exam-state";
import { cn } from "@/lib/utils";

type Props = {
  passage: ReadingPassage;
  groups: QuestionGroup[];
  answers: AnswerMap;
  current: number | null;
  textSize: TextSize;
  marks?: ReadingMark[];
  fgColor?: string;
  onMarkClick?: (id: string) => void;
  onAnswer: (n: number, value: string | null) => void;
  onFocus: (n: number) => void;
};

function HeadingDropZone({
  questionN,
  section,
  assignedLabel,
  isActive,
  isExample,
  onAssign,
  onFocus,
}: {
  questionN: number;
  section: string;
  assignedLabel?: string;
  isActive: boolean;
  isExample?: boolean;
  onAssign: (headingId: string | null) => void;
  onFocus: () => void;
}) {
  const ctx = useReadingHeadings();
  const picked = ctx?.pickedHeadingId ?? null;
  const setPicked = ctx?.setPickedHeadingId ?? (() => {});

  if (isExample) {
    return (
      <div
        id={`heading-zone-${section}`}
        className="mb-2 flex min-h-[2.25rem] items-center justify-between gap-2 rounded-md border-2 border-amber-300 bg-amber-50/90 px-3 py-1.5"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Example
          </p>
          <span className="text-[13px] font-medium leading-snug text-amber-950">
            {assignedLabel ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`heading-zone-${section}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) {
          onAssign(id);
          setPicked(null);
        }
      }}
      onClick={() => {
        onFocus();
        if (picked) {
          onAssign(picked);
          setPicked(null);
        }
      }}
      className={cn(
        "mb-2 flex min-h-[2.25rem] cursor-pointer items-center justify-between gap-2 rounded-md border-2 border-dashed px-3 py-1.5 transition",
        isActive
          ? "border-navy bg-sky-50"
          : assignedLabel
            ? "border-emerald-300 bg-emerald-50/80"
            : "border-slate-300 bg-slate-50 hover:border-navy",
      )}
    >
      {assignedLabel ? (
        <>
          <span className="text-[13px] font-medium leading-snug text-emerald-900">
            {assignedLabel}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssign(null);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-emerald-700 hover:bg-emerald-100"
            aria-label={`Clear heading for section ${section}`}
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <span className="text-[12px] text-slate-400">
          {picked ? "Click to place heading" : `Drop heading for section ${section}`}
        </span>
      )}
    </div>
  );
}

export function PassageWithHeadingZones({
  passage,
  groups,
  answers,
  current,
  textSize,
  marks = [],
  fgColor,
  onMarkClick,
  onAnswer,
  onFocus,
}: Props) {
  const headingGroups = matchingHeadingsForPassage(groups);
  const markers = passageSectionLabels(passage.paragraphs);
  const size = textSizeProps(textSize);

  const zoneBySection = new Map<
    string,
    { questionN: number; group: MatchingGroup; optionId?: string; isExample?: boolean }
  >();

  for (const group of headingGroups) {
    const example = group.example;
    if (example?.section && example.headingId) {
      const section = example.section.trim().toUpperCase();
      zoneBySection.set(section, {
        questionN: 0,
        group,
        optionId: example.headingId,
        isExample: true,
      });
    }
    const map = sectionQuestionMap(group, markers);
    for (const [section, q] of map) {
      const optionId = answers[q.n] as string | undefined;
      zoneBySection.set(section, { questionN: q.n, group, optionId });
    }
  }

  return (
    <div
      className="mx-auto max-w-prose"
      data-exam-text-size={size["data-exam-text-size"]}
      style={{ ...PASSAGE_FONT_STYLE, color: fgColor, ...size.style }}
    >
      <h2 className="mb-2 text-center text-xl font-bold">{passage.title}</h2>
      {passage.subtitle?.trim() && (
        <p className="mb-5 text-center text-[15px] italic leading-snug text-slate-600">
          {passage.subtitle}
        </p>
      )}
      {!passage.subtitle?.trim() && <div className="mb-4" />}

      <div className="space-y-4 leading-7">
        {passage.paragraphs.map((para, i) => {
          const section = para.marker?.trim().toUpperCase();
          const zone = section ? zoneBySection.get(section) : undefined;
          const paraMarks = marksForParagraph(marks, passage.id, i);
          const plainText = isHtmlContent(para.text)
            ? sanitizePassageHtml(para.text).replace(/<[^>]+>/g, "")
            : para.text;
          const segments = splitMarkedText(plainText, paraMarks);
          const selectable = !isHtmlContent(para.text);

          return (
            <div key={i}>
              {zone && (
                <HeadingDropZone
                  questionN={zone.questionN}
                  section={section!}
                  assignedLabel={
                    zone.optionId
                      ? headingLabel(zone.group.options, zone.optionId)
                      : undefined
                  }
                  isActive={current === zone.questionN}
                  isExample={zone.isExample}
                  onFocus={() => onFocus(zone.questionN)}
                  onAssign={(headingId) => {
                    if (zone.isExample) return;
                    if (headingId) {
                      for (const g of headingGroups) {
                        for (const q of g.questions) {
                          if (q.n !== zone.questionN && answers[q.n] === headingId) {
                            onAnswer(q.n, null);
                          }
                        }
                      }
                    }
                    onAnswer(zone.questionN, headingId);
                  }}
                />
              )}
              <p data-passage-para={i}>
                {para.marker && (
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center border border-current align-text-bottom text-[12px] font-bold opacity-70">
                    {para.marker}
                  </span>
                )}
                {selectable ? (
                  <span data-passage-text="">
                    {segments.map((seg, j) =>
                      seg.type === "text" ? (
                        <span key={j}>{seg.value}</span>
                      ) : (
                        <mark
                          key={seg.mark.id}
                          onClick={() => onMarkClick?.(seg.mark.id)}
                          className={
                            seg.mark.kind === "note"
                              ? "cursor-pointer bg-[#1e4a7a] text-white"
                              : "cursor-pointer bg-[#7B4B5A] text-white"
                          }
                        >
                          {seg.value}
                        </mark>
                      ),
                    )}
                  </span>
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: sanitizePassageHtml(para.text),
                    }}
                  />
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
