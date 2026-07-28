"use client";

import type { ReadingPassage } from "@/lib/exam/types";
import { isHtmlContent, sanitizePassageHtml } from "@/lib/admin/content/sanitize-html";
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

type Props = {
  passage: ReadingPassage;
  marks: ReadingMark[];
  textSize: TextSize;
  fgColor?: string;
  onMarkClick: (id: string) => void;
};

function plainParagraphText(text: string): string {
  if (!isHtmlContent(text)) return text;
  return sanitizePassageHtml(text).replace(/<[^>]+>/g, "");
}

export function SelectablePassage({
  passage,
  marks,
  textSize,
  fgColor,
  onMarkClick,
}: Props) {
  const size = textSizeProps(textSize);
  return (
    <div
      className="mx-auto max-w-prose"
      data-exam-text-size={size["data-exam-text-size"]}
      style={{ ...PASSAGE_FONT_STYLE, color: fgColor, ...size.style }}
    >
      <h2 className="mb-2 text-center text-xl font-bold">{passage.title}</h2>
      {passage.subtitle?.trim() && (
        <p className="mb-5 text-center text-[15px] italic leading-snug opacity-80">
          {passage.subtitle}
        </p>
      )}
      {!passage.subtitle?.trim() && <div className="mb-4" />}
      <div className="space-y-4 leading-7">
        {passage.paragraphs.map((para, i) => {
          const plainText = plainParagraphText(para.text);
          const paraMarks = marksForParagraph(marks, passage.id, i);
          const segments = splitMarkedText(plainText, paraMarks);
          const selectable = !isHtmlContent(para.text);

          return (
            <p key={i} data-passage-para={i}>
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
                        data-mark-id={seg.mark.id}
                        onClick={() => onMarkClick(seg.mark.id)}
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
          );
        })}
      </div>
    </div>
  );
}
