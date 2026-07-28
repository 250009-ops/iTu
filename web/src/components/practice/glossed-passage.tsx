"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { Globe, X } from "lucide-react";
import type { PracticeGlossaryEntry } from "@/lib/api/practice";
import { cn } from "@/lib/utils";

export type GlossLanguage = "en" | "uz" | "ru";

type Paragraph = { marker?: string; text: string };

type Props = {
  title?: string;
  subtitle?: string;
  paragraphs: Paragraph[];
  glossary: PracticeGlossaryEntry[];
  language: GlossLanguage;
  onLanguageChange?: (lang: GlossLanguage) => void;
  highlightQuote?: string | null;
  highlightMarker?: string | null;
  onTapSentence?: (quote: string, marker: string | null) => void;
  /** Paragraph-picking mode used by the Scan trainer. */
  tapMode?: boolean;
  /** Markers already picked in tap mode. */
  tappedMarkers?: string[];
  /** Show the "tap underlined words" helper above the text. */
  showGlossHint?: boolean;
  /**
   * `card` keeps the standalone white panel. `bare` drops the panel so the
   * passage can fill a scrolling split pane.
   */
  variant?: "card" | "bare";
  className?: string;
};

const KIND_STYLE: Record<string, string> = {
  word: "bg-blue-50 text-blue-700",
  phrase: "bg-emerald-50 text-emerald-700",
  idiom: "bg-amber-50 text-amber-700",
  collocation: "bg-violet-50 text-violet-700",
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
  subtitle,
  paragraphs,
  glossary,
  language,
  onLanguageChange,
  highlightQuote,
  highlightMarker,
  onTapSentence,
  tapMode = false,
  tappedMarkers = [],
  showGlossHint = false,
  variant = "card",
  className,
}: Props) {
  const [active, setActive] = useState<PracticeGlossaryEntry | null>(null);
  const [activeLang, setActiveLang] = useState<GlossLanguage>(language);

  const byMarker = useMemo(() => {
    const map = new Map<string, PracticeGlossaryEntry[]>();
    for (const g of glossary) {
      if (!g?.span || typeof g.span !== "string") continue;
      const key = g.paragraphMarker ?? "";
      const list = map.get(key) ?? [];
      list.push(g);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (b.span?.length ?? 0) - (a.span?.length ?? 0));
    }
    return map;
  }, [glossary]);

  const hasGlossary = glossary.length > 0;

  function openGloss(entry: PracticeGlossaryEntry) {
    setActiveLang(language);
    setActive(entry);
  }

  const Wrapper = variant === "card" ? "article" : "div";

  return (
    <Wrapper
      className={cn(
        "relative",
        variant === "card" &&
          "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {(title || onLanguageChange) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-bold text-navy">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
            )}
          </div>
          {onLanguageChange && (
            <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              {(["en", "uz", "ru"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange(lang)}
                  className={cn(
                    "rounded-md px-2 py-1 uppercase transition-colors",
                    language === lang
                      ? "bg-navy text-white"
                      : "text-slate-500 hover:text-navy",
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showGlossHint && hasGlossary && (
        <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          <Globe className="h-3 w-3 shrink-0" />
          Tap underlined words for the glossary (EN / UZ / RU)
        </div>
      )}

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
        const isTapped = tappedMarkers.some(
          (m) => m.toUpperCase() === marker.toUpperCase(),
        );
        const nodes = renderGlossedText(plain, entries, openGloss);

        const handleClick = (e: MouseEvent<HTMLDivElement>) => {
          if ((e.target as HTMLElement).closest("[data-gloss]")) return;
          if (tapMode) {
            onTapSentence?.(plain.slice(0, 80), marker);
            return;
          }
          if (!onTapSentence) return;
          onTapSentence(plain.slice(0, 80), marker);
        };

        return (
          <div
            key={idx}
            data-marker={marker}
            id={`practice-para-${marker}`}
            onClick={handleClick}
            className={cn(
              "mb-3 scroll-mt-24 rounded-xl border px-3.5 py-3 transition-colors",
              isHighlightPara
                ? "animate-practice-evidence-flash border-amber-300 bg-amber-50"
                : tapMode
                  ? isTapped
                    ? "border-emerald-200 bg-emerald-50"
                    : "cursor-pointer border-slate-200 bg-white/60 hover:border-navy/30 hover:bg-white"
                  : "border-transparent",
              !tapMode && onTapSentence && "cursor-pointer",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white",
                  isHighlightPara ? "bg-amber-500" : "bg-navy",
                )}
              >
                {marker}
              </span>
              <p className="min-w-0 flex-1 text-[14.5px] leading-[1.78] text-slate-800">
                {highlightQuote &&
                isHighlightPara &&
                plain.includes(highlightQuote) ? (
                  <HighlightedPlain text={plain} quote={highlightQuote} />
                ) : (
                  nodes
                )}
              </p>
              {tapMode && isTapped && (
                <span className="mt-1 shrink-0 text-xs font-bold text-emerald-600">
                  ✓
                </span>
              )}
            </div>
          </div>
        );
      })}

      {active && (
        <div className="sticky bottom-2 z-20 mt-3 animate-practice-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(27,42,74,0.16)]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3.5 py-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[13.5px] font-bold text-navy">
                {active.span}
              </span>
              {active.pos && (
                <span className="text-[11px] italic text-slate-400">
                  {active.pos}
                </span>
              )}
              {active.level && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  {active.level}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:text-navy"
              aria-label="Close glossary"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="flex gap-1 px-3.5 pt-2.5">
            {(["en", "uz", "ru"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                className={cn(
                  "rounded-lg px-2 py-1 text-[11px] font-semibold uppercase transition-colors",
                  activeLang === lang
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-slate-500 hover:text-navy",
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          <p className="px-3.5 pt-2 text-[12.5px] leading-relaxed text-slate-700">
            {senseFor(active, activeLang)}
          </p>

          <div className="flex items-center gap-2 px-3.5 py-3">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium",
                KIND_STYLE[active.kind] ?? KIND_STYLE.word,
              )}
            >
              {active.kind}
            </span>
            {active.paragraphMarker && (
              <span className="text-[11px] text-slate-400">
                Para. {active.paragraphMarker}
              </span>
            )}
          </div>
        </div>
      )}
    </Wrapper>
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
          "rounded-sm px-px text-blue-700 underline decoration-dotted underline-offset-[3px] transition-colors",
          isPhrase
            ? "decoration-emerald-500 hover:bg-emerald-50"
            : "decoration-blue-400 hover:bg-blue-50",
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

function HighlightedPlain({ text, quote }: { text: string; quote: string }) {
  const idx = text.indexOf(quote);
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-200 px-1 py-0.5 font-medium text-amber-900">
        {quote}
      </mark>
      {text.slice(idx + quote.length)}
    </>
  );
}
