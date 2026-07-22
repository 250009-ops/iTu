"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { MapLabelingGroup } from "@/lib/exam/types";
import { usedMatchOptionIds } from "@/lib/exam/matching-options";
import { cn } from "@/lib/utils";

interface MapLabelingProps {
  group: MapLabelingGroup;
  answers: Record<number, string>;
  current: number | null;
  reuseOptions?: boolean;
  onAssign: (n: number, value: string | null) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
}

type LetterItem = { id: string; label: string };

function useLetterMatching({
  questionNumbers,
  answers,
  reuseOptions = true,
  onAssign,
  onFocus,
}: {
  questionNumbers: number[];
  answers: Record<number, string>;
  reuseOptions?: boolean;
  onAssign: (n: number, value: string | null) => void;
  onFocus: (n: number) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const questions = questionNumbers.map((n) => ({ n }));

  function assign(n: number, id: string | null) {
    if (!reuseOptions && id) {
      for (const q of questions) {
        if (q.n !== n && answers[q.n] === id) {
          onAssign(q.n, null);
        }
      }
    }
    onAssign(n, id);
  }

  const handleSlotActivate = (n: number) => {
    onFocus(n);
    if (picked) {
      assign(n, picked);
      setPicked(null);
    }
  };

  const usedElsewhere = (forQuestion: number | null) =>
    reuseOptions
      ? new Set<string>()
      : usedMatchOptionIds(questions, answers, forQuestion ?? undefined);

  return {
    picked,
    setPicked,
    dragOver,
    setDragOver,
    assign,
    usedElsewhere,
    handleSlotActivate,
  };
}

function LetterBank({
  items,
  picked,
  setPicked,
  usedElsewhere,
  current,
}: {
  items: LetterItem[];
  picked: string | null;
  setPicked: (id: string | null) => void;
  usedElsewhere: (forQuestion: number | null) => Set<string>;
  current: number | null;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      {items.map((item) => {
        const isPicked = picked === item.id;
        const isUsed = usedElsewhere(current).has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            draggable={!isUsed || isPicked}
            onDragStart={(e) => {
              if (isUsed && !isPicked) return;
              e.dataTransfer.setData("text/plain", item.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => {
              if (isUsed && !isPicked) return;
              setPicked(isPicked ? null : item.id);
            }}
            className={cn(
              "flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border text-sm font-bold transition active:cursor-grabbing",
              isUsed && !isPicked
                ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                : isPicked
                  ? "border-navy bg-navy text-white shadow-md"
                  : "border-slate-200 bg-white text-navy hover:border-navy hover:bg-sky-50",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function AnswerDropSlot({
  questionNumber,
  assignedId,
  isActive,
  picked,
  dragOver,
  setDragOver,
  assign,
  handleSlotActivate,
  setPicked,
  compact,
}: {
  questionNumber: number;
  assignedId?: string;
  isActive: boolean;
  picked: string | null;
  dragOver: number | null;
  setDragOver: (n: number | null) => void;
  assign: (n: number, id: string | null) => void;
  handleSlotActivate: (n: number) => void;
  setPicked: (id: string | null) => void;
  compact?: boolean;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(questionNumber);
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = e.dataTransfer.getData("text/plain");
        if (id) assign(questionNumber, id);
        setDragOver(null);
        setPicked(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        handleSlotActivate(questionNumber);
      }}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-lg border-2 border-dashed transition",
        compact ? "h-7 min-w-[3rem] px-2" : "h-9 min-w-[4.5rem] px-2.5",
        dragOver === questionNumber
          ? "border-navy bg-sky-100"
          : assignedId
            ? "border-emerald-300 bg-emerald-50"
            : isActive
              ? "border-navy bg-sky-50"
              : "border-slate-300 bg-slate-50 hover:border-navy",
      )}
    >
      {assignedId ? (
        <>
          <span
            className={cn(
              "font-bold text-emerald-800",
              compact ? "text-[13px]" : "text-[13px]",
            )}
          >
            {assignedId}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              assign(questionNumber, null);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-emerald-600 hover:bg-emerald-100"
            aria-label={`Clear answer for question ${questionNumber}`}
          >
            <X size={13} />
          </button>
        </>
      ) : (
        <span className="w-full text-center text-[12px] text-slate-400">
          {picked ? "Drop here" : "—"}
        </span>
      )}
    </div>
  );
}

function MapLabelingPlaceListMode({
  group,
  answers,
  current,
  reuseOptions = true,
  onAssign,
  onFocus,
}: MapLabelingProps) {
  const markers = group.mapMarkers ?? [];
  const questions = group.questions ?? [];
  const letters: LetterItem[] = markers.map((m) => ({ id: m.id, label: m.id }));
  const questionNumbers = questions.map((q) => q.n);
  const {
    picked,
    setPicked,
    dragOver,
    setDragOver,
    assign,
    usedElsewhere,
    handleSlotActivate,
  } = useLetterMatching({
    questionNumbers,
    answers,
    reuseOptions,
    onAssign,
    onFocus,
  });

  return (
    <div className="space-y-4">
      <LetterBank
        items={letters}
        picked={picked}
        setPicked={setPicked}
        usedElsewhere={usedElsewhere}
        current={current}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <MapCanvas
          group={group}
          answers={answers}
          current={current}
          onFocus={onFocus}
          renderMarker={() => null}
          overlayMarkers={markers}
        />

        <ol className="space-y-2">
          {questions.map((q) => {
            const assignedId = answers[q.n]?.trim() || undefined;
            const isActive = current === q.n;
            return (
              <li
                key={q.n}
                id={`q-${q.n}`}
                className={cn(
                  "scroll-mt-20 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition",
                  isActive ? "border-navy bg-sky-50" : "border-slate-200 bg-white",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">
                  {q.n}
                </span>
                <span className="min-w-0 flex-1 text-[14px] text-slate-800">{q.prompt}</span>
                <AnswerDropSlot
                  questionNumber={q.n}
                  assignedId={assignedId}
                  isActive={isActive}
                  picked={picked}
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  assign={assign}
                  handleSlotActivate={handleSlotActivate}
                  setPicked={setPicked}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function MapCanvas({
  group,
  answers,
  current,
  onFocus,
  renderMarker,
  overlayMarkers,
}: {
  group: MapLabelingGroup;
  answers: Record<number, string>;
  current: number | null;
  onFocus: (n: number) => void;
  renderMarker: (zone: MapLabelingGroup["zones"][number]) => ReactNode;
  overlayMarkers?: { id: string; x: number; y: number }[];
}) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-[#eef3f8]">
      {group.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.imageUrl}
          alt={group.imageLabel}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <svg
          viewBox="0 0 400 300"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <rect width="400" height="300" fill="#eef3f8" />
          <path
            d="M0 90 C80 110 120 60 200 80 S340 130 400 110 L400 150 C340 170 260 120 200 130 S80 160 0 140 Z"
            fill="#bfdbfe"
          />
          <ellipse cx="300" cy="220" rx="55" ry="38" fill="#bfdbfe" />
          <path
            d="M40 40 L40 280 M40 200 L360 200"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeDasharray="6 6"
            fill="none"
          />
          <path
            d="M160 20 L160 280"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeDasharray="6 6"
            fill="none"
          />
          <rect x="60" y="220" width="70" height="55" rx="6" fill="#bbf7d0" />
          <rect x="220" y="40" width="80" height="45" rx="6" fill="#bbf7d0" />
        </svg>
      )}

      {overlayMarkers?.map((marker) => (
        <span
          key={marker.id}
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          className="pointer-events-none absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-navy text-[13px] font-bold text-white shadow-md"
        >
          {marker.id}
        </span>
      ))}

      {group.zones.map((zone) => (
        <div
          key={zone.n}
          role="button"
          tabIndex={0}
          style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
          onClick={() => onFocus(zone.n)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onFocus(zone.n);
          }}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 transition",
            current === zone.n && "z-10",
          )}
        >
          {renderMarker(zone)}
        </div>
      ))}
    </div>
  );
}

function MapLabelingOptionMode({
  group,
  answers,
  current,
  reuseOptions = true,
  onAssign,
  onFocus,
}: MapLabelingProps) {
  const letters: LetterItem[] = group.options.map((opt) => ({
    id: opt.id,
    label: opt.label,
  }));
  const questionNumbers = group.zones.map((z) => z.n);
  const {
    picked,
    setPicked,
    dragOver,
    setDragOver,
    assign,
    usedElsewhere,
    handleSlotActivate,
  } = useLetterMatching({
    questionNumbers,
    answers,
    reuseOptions,
    onAssign,
    onFocus,
  });

  return (
    <div className="space-y-4">
      <LetterBank
        items={letters}
        picked={picked}
        setPicked={setPicked}
        usedElsewhere={usedElsewhere}
        current={current}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <MapCanvas
          group={group}
          answers={answers}
          current={current}
          onFocus={(n) => handleSlotActivate(n)}
          renderMarker={(zone) => {
            const assignedId = answers[zone.n]?.trim() || undefined;
            const isActive = current === zone.n;
            return (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(zone.n);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) assign(zone.n, id);
                  setDragOver(null);
                  setPicked(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSlotActivate(zone.n);
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-bold shadow-sm",
                  dragOver === zone.n
                    ? "scale-110 border-navy bg-navy text-white"
                    : assignedId
                      ? "border-emerald-500 bg-white text-emerald-700"
                      : isActive
                        ? "border-navy bg-white text-navy"
                        : "border-slate-400 bg-white text-slate-500 hover:border-navy",
                )}
              >
                {assignedId ?? zone.n}
              </div>
            );
          }}
        />

        <ol className="space-y-2">
          {group.zones.map((zone) => {
            const assignedId = answers[zone.n]?.trim() || undefined;
            const isActive = current === zone.n;
            return (
              <li
                key={zone.n}
                id={`q-${zone.n}`}
                className={cn(
                  "scroll-mt-20 flex items-center gap-3 rounded-lg border px-3 py-2 transition",
                  isActive
                    ? "border-navy bg-sky-50"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">
                  {zone.n}
                </span>
                <span className="flex-1 text-[14px] text-slate-700">{zone.label}</span>
                <AnswerDropSlot
                  questionNumber={zone.n}
                  assignedId={assignedId}
                  isActive={isActive}
                  picked={picked}
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  assign={assign}
                  handleSlotActivate={handleSlotActivate}
                  setPicked={setPicked}
                  compact
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function MapLabelingTextMode({
  group,
  answers,
  current,
  onAssign,
  onFocus,
  onPasteBlocked,
}: MapLabelingProps) {
  return (
    <div className="space-y-4">
      <MapCanvas
        group={group}
        answers={answers}
        current={current}
        onFocus={onFocus}
        renderMarker={(zone) => {
          const value = answers[zone.n]?.trim() ?? "";
          const isActive = current === zone.n;
          return (
            <span
              className={cn(
                "flex min-h-8 min-w-8 items-center justify-center rounded-full border-2 px-1 text-[13px] font-bold shadow-sm",
                value
                  ? "border-emerald-500 bg-white text-emerald-700"
                  : isActive
                    ? "border-navy bg-white text-navy"
                    : "border-slate-400 bg-white text-slate-500",
              )}
            >
              {zone.n}
            </span>
          );
        }}
      />

      <ol className="space-y-2">
        {group.zones.map((zone) => {
          const value = answers[zone.n] ?? "";
          const isActive = current === zone.n;
          return (
            <li
              key={zone.n}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 transition",
                isActive ? "border-navy bg-sky-50" : "border-slate-200 bg-white",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">
                {zone.n}
              </span>
              {zone.label ? (
                <span className="min-w-0 flex-1 text-[14px] text-slate-700">{zone.label}</span>
              ) : null}
              <input
                type="text"
                value={value}
                onFocus={() => onFocus(zone.n)}
                onChange={(e) => onAssign(zone.n, e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  onPasteBlocked?.();
                }}
                spellCheck={false}
                autoComplete="off"
                placeholder="Your answer"
                className={cn(
                  "min-w-[10rem] flex-1 rounded-md border-b-2 bg-transparent px-2 py-1 text-[14px] text-navy outline-none",
                  isActive
                    ? "border-navy bg-sky-50/50"
                    : value.trim()
                      ? "border-emerald-400"
                      : "border-slate-300",
                )}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MapLabeling(props: MapLabelingProps) {
  const layout = props.group.layoutMode ?? "zones";
  if (layout === "place_list") {
    return <MapLabelingPlaceListMode {...props} />;
  }
  const mode = props.group.answerMode ?? "option";
  if (mode === "text") {
    return <MapLabelingTextMode {...props} />;
  }
  return <MapLabelingOptionMode {...props} />;
}
