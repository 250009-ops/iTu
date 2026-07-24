"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { PracticeGlossaryEntry } from "@/lib/api/practice";
import { cn } from "@/lib/utils";

export type GlossLanguage = "en" | "uz" | "ru";

type Paragraph = { marker?: string; text: string };

type Props = {
  title?: string;
  paragraphs: Paragraph[];
  glossary: PracticeGlossaryEntry[];
  language: GlossLanguage;
  onLanguageChange?: (lang: GlossLanguage) => void;
  highlightQuote?: string | null;
  highlightMarker?: string | null;
  onTapSentence?: (quote: string, marker: string | null) => void;
  className?: string;
};

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function senseFor(entry: PracticeGlossaryEntry, lang: GlossLanguage) {
  if (lang === "uz" && entry.sense.uz) return entry.sense.uz;
  if (lang === "ru" && entry.sense.ru) return entry.sense.ru;
  return entry.sense.en;
}

export function GlossedPassage({
  title,
  paragraphs,
  glossary,
  language,
  onLanguageChange,
  highlightQuote,
  highlightMarker,
  onTapSentence,
  className,
}: Props) {
  const [active, setActive] = useState<PracticeGlossaryEntry | null>(null);

  const byMarker = useMemo(() => {
    const map = new Map<string, PracticeGlossaryEntry[]>();
    for (const g of glossary) {
      const key = g.paragraphMarker ?? "";
      const list = map.get(key) ?? [];
      list.push(g);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.span.length - a.span.length);
    }
    return map;
  }, [glossary]);

  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {title ? (
          <h2 className="text-base font-semibold text-navy">{title}</h2>
        ) : (
          <span />
        )}
        {onLanguageChange && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {(["en", "uz", "ru"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={cn(
                  "rounded-md px-2 py-1 uppercase",
                  language === lang
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-500",
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {paragraphs.map((para, idx) => {
        const marker = para.marker?.trim() || String.fromCharCode(65 + idx);
        const plain = stripHtml(para.text);
        const entries = [
          ...(byMarker.get(marker) ?? []),
          ...(byMarker.get("") ?? []),
        ];
        const isHighlightPara =
          highlightMarker != null &&
          highlightMarker.toUpperCase() === marker.toUpperCase();
        const nodes = renderGlossedText(plain, entries, (entry) =>
          setActive(entry),
        );

        return (
          <p
            key={idx}
            data-marker={marker}
            className={cn(
              "mb-4 scroll-mt-24 text-sm leading-relaxed text-slate-800",
              isHighlightPara && "rounded-lg bg-amber-50/80 ring-1 ring-amber-200",
            )}
            onClick={(e) => {
              if (!onTapSentence) return;
              if ((e.target as HTMLElement).closest("[data-gloss]")) return;
              onTapSentence(plain.slice(0, 80), marker);
            }}
          >
            <span className="mr-2 font-semibold text-navy">{marker}</span>
            {highlightQuote &&
            isHighlightPara &&
            plain.includes(highlightQuote) ? (
              <HighlightedPlain
                text={plain}
                quote={highlightQuote}
                glossNodes={nodes}
              />
            ) : (
              nodes
            )}
          </p>
        );
      })}

      {active && (
        <div className="sticky bottom-3 mt-4 rounded-xl border border-navy/15 bg-navy px-4 py-3 text-sm text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">
                {active.kind}
                {active.level ? ` · ${active.level}` : ""}
              </p>
              <p className="font-semibold">{active.span}</p>
              <p className="mt-1 text-white/90">{senseFor(active, language)}</p>
            </div>
            <button
              type="button"
              className="text-white/70 hover:text-white"
              onClick={() => setActive(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function renderGlossedText(
  text: string,
  entries: PracticeGlossaryEntry[],
  onTap: (e: PracticeGlossaryEntry) => void,
): ReactNode[] {
  if (!entries.length) return [text];

  type Span = { start: number; end: number; entry: PracticeGlossaryEntry };
  const spans: Span[] = [];
  const lower = text.toLowerCase();
  for (const entry of entries) {
    const needle = entry.span.toLowerCase();
    if (!needle) continue;
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      const end = idx + needle.length;
      const overlaps = spans.some((s) => idx < s.end && end > s.start);
      if (!overlaps) spans.push({ start: idx, end, entry });
      from = end;
    }
  }
  spans.sort((a, b) => a.start - b.start);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start > cursor) nodes.push(text.slice(cursor, span.start));
    const isPhrase =
      span.entry.kind === "phrase" ||
      span.entry.kind === "idiom" ||
      span.entry.kind === "collocation";
    nodes.push(
      <button
        key={`${span.start}-${i}`}
        type="button"
        data-gloss
        onClick={(e) => {
          e.stopPropagation();
          onTap(span.entry);
        }}
        className={cn(
          "rounded-sm underline decoration-dotted underline-offset-2 transition",
          isPhrase
            ? "bg-sky-50 decoration-sky-500 hover:bg-sky-100"
            : "decoration-slate-400 hover:bg-slate-100",
        )}
      >
        {text.slice(span.start, span.end)}
      </button>,
    );
    cursor = span.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function HighlightedPlain({
  text,
  quote,
  glossNodes,
}: {
  text: string;
  quote: string;
  glossNodes: ReactNode[];
}) {
  const idx = text.indexOf(quote);
  if (idx < 0) return <>{glossNodes}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="animate-pulse rounded bg-amber-200 px-0.5 text-inherit">
        {quote}
      </mark>
      {text.slice(idx + quote.length)}
    </>
  );
}
