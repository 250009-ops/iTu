"use client";

import { useState, type ReactNode } from "react";
import type { MapLabelingGroup } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

interface MapLabelingProps {
  group: MapLabelingGroup;
  answers: Record<number, string>;
  current: number | null;
  onAssign: (n: number, value: string | null) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
}

function MapLabelingPlaceListMode({
  group,
  answers,
  current,
  onAssign,
  onFocus,
}: MapLabelingProps) {
  const markers = group.mapMarkers ?? [];
  const questions = group.questions ?? [];

  return (
    <div className="space-y-4">
      <MapCanvas
        group={group}
        answers={answers}
        current={current}
        onFocus={() => {}}
        renderMarker={(zone) => null}
        overlayMarkers={markers}
      />

      <ol className="space-y-2">
        {questions.map((q) => {
          const value = answers[q.n]?.trim() ?? "";
          const isActive = current === q.n;
          return (
            <li
              key={q.n}
              id={`q-${q.n}`}
              className={cn(
                "scroll-mt-20 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 transition",
                isActive ? "border-navy bg-sky-50" : "border-slate-200 bg-white",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">
                {q.n}
              </span>
              <span className="min-w-0 flex-1 text-[14px] text-slate-800">{q.prompt}</span>
              <div className="flex flex-wrap gap-1.5">
                {markers.map((m) => {
                  const picked = value.toUpperCase() === m.id.toUpperCase();
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onFocus(q.n);
                        onAssign(q.n, picked ? null : m.id);
                      }}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition",
                        picked
                          ? "border-navy bg-navy text-white shadow-md"
                          : "border-slate-200 bg-white text-navy hover:border-navy hover:bg-sky-50",
                      )}
                    >
                      {m.id}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
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
        <button
          key={zone.n}
          type="button"
          style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
          onClick={() => onFocus(zone.n)}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 transition",
            current === zone.n && "z-10",
          )}
        >
          {renderMarker(zone)}
        </button>
      ))}
    </div>
  );
}

function MapLabelingOptionMode({
  group,
  answers,
  current,
  onAssign,
  onFocus,
}: MapLabelingProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        {group.options.map((opt) => {
          const isPicked = picked === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", opt.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => setPicked(isPicked ? null : opt.id)}
              className={cn(
                "flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border text-sm font-bold transition active:cursor-grabbing",
                isPicked
                  ? "border-navy bg-navy text-white shadow-md"
                  : "border-slate-200 bg-white text-navy hover:border-navy hover:bg-sky-50",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MapCanvas
          group={group}
          answers={answers}
          current={current}
          onFocus={(n) => {
            onFocus(n);
            if (picked) {
              onAssign(n, picked);
              setPicked(null);
            }
          }}
          renderMarker={(zone) => {
            const assignedId = answers[zone.n];
            const assigned = group.options.find((o) => o.id === assignedId);
            const isActive = current === zone.n;
            return (
              <span
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
                  if (id) onAssign(zone.n, id);
                  setDragOver(null);
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-bold shadow-sm",
                  dragOver === zone.n
                    ? "scale-110 border-navy bg-navy text-white"
                    : assigned
                      ? "border-emerald-500 bg-white text-emerald-700"
                      : isActive
                        ? "border-navy bg-white text-navy"
                        : "border-slate-400 bg-white text-slate-500 hover:border-navy",
                )}
              >
                {assigned ? assigned.label : zone.n}
              </span>
            );
          }}
        />

        <ol className="space-y-2">
          {group.zones.map((zone) => {
            const assignedId = answers[zone.n];
            const assigned = group.options.find((o) => o.id === assignedId);
            const isActive = current === zone.n;
            return (
              <li
                key={zone.n}
                onClick={() => {
                  onFocus(zone.n);
                  if (picked) {
                    onAssign(zone.n, picked);
                    setPicked(null);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition",
                  isActive
                    ? "border-navy bg-sky-50"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">
                  {zone.n}
                </span>
                <span className="flex-1 text-[14px] text-slate-700">{zone.label}</span>
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-md border-2 text-[13px] font-bold",
                    assigned
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-dashed border-slate-300 text-slate-300",
                  )}
                >
                  {assigned ? assigned.label : "—"}
                </span>
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
