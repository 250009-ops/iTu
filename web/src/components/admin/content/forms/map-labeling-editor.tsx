"use client";

import { useCallback, useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnswerKeyField } from "@/components/admin/content/forms/answer-key-field";
import { MatchOptionsBankEditor } from "@/components/admin/content/forms/matching-editor-parts";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { MapLabelingGroup } from "@/lib/exam/types";
import { uploadContentMedia } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Props = {
  group: MapLabelingGroup;
  testId: string;
  answerKey: AnswerKeyMap;
  onChange: (group: MapLabelingGroup) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
};

export function MapLabelingEditor({
  group,
  testId,
  answerKey,
  onChange,
  onAnswerKeyChange,
}: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const key = `map-${group.id}`;
        const result = await uploadContentMedia(testId, key, file);
        onChange({ ...group, imageUrl: result.url });
        toast("Map image uploaded", { variant: "success" });
      } catch (err) {
        toast("Upload failed", {
          description: getErrorMessage(err, "Could not upload map image."),
          variant: "error",
        });
      } finally {
        setUploading(false);
      }
    },
    [group, onChange, testId, toast],
  );

  const zones = group.zones ?? [];
  const options = group.options ?? [];
  const answerMode = group.answerMode ?? "option";
  const isTextMode = answerMode === "text";

  function setAnswerMode(mode: "option" | "text") {
    onChange({
      ...group,
      answerMode: mode,
      hint:
        mode === "text"
          ? "Write the correct word or phrase for each label."
          : "Drag the correct letter next to each location.",
    });
  }

  function placeZone(clientX: number, clientY: number) {
    if (activeZone == null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(95, Math.max(5, ((clientY - rect.top) / rect.height) * 100));
    const nextZones = zones.map((z) =>
      z.n === activeZone ? { ...z, x: Math.round(x), y: Math.round(y) } : z,
    );
    onChange({ ...group, zones: nextZones });
  }

  return (
    <div className="space-y-4">
      <Input
        value={group.imageLabel}
        onChange={(e) => onChange({ ...group, imageLabel: e.target.value })}
        placeholder="Diagram or map title"
      />

      <div className="space-y-2">
        <Label className="text-xs">How candidates answer</Label>
        <select
          value={answerMode}
          onChange={(e) => setAnswerMode(e.target.value as "option" | "text")}
          className="h-9 w-full max-w-md rounded-md border border-border bg-white px-2 text-sm"
        >
          <option value="option">Choose from letter list (A, B, C…)</option>
          <option value="text">Write the answer (words or numbers)</option>
        </select>
        <p className="text-xs text-muted">
          {isTextMode
            ? "Use for diagram/process labeling where students type answers (e.g. NO MORE THAN TWO WORDS)."
            : "Use for map tasks where students pick a letter from a list and place it on each location."}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted">
          Map image
        </Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          loading={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {group.imageUrl ? "Replace map image" : "Upload map image"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">
          Select a zone number, then click the map to position it
        </Label>
        <div className="flex flex-wrap gap-1">
          {zones.map((z) => (
            <button
              key={z.n}
              type="button"
              onClick={() => setActiveZone(activeZone === z.n ? null : z.n)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold",
                activeZone === z.n
                  ? "bg-navy text-white"
                  : "border border-border bg-white text-navy",
              )}
            >
              {z.n}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={canvasRef}
        className="relative aspect-[4/3] cursor-crosshair overflow-hidden rounded-xl border border-slate-200 bg-[#eef3f8]"
        onClick={(e) => placeZone(e.clientX, e.clientY)}
      >
        {group.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.imageUrl}
            alt={group.imageLabel}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Upload a map image, then place zone markers
          </div>
        )}

        {zones.map((zone) => (
          <button
            key={zone.n}
            type="button"
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveZone(zone.n);
            }}
            className={cn(
              "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-sm",
              activeZone === zone.n
                ? "border-navy bg-navy text-white"
                : "border-white bg-emerald-500 text-white",
            )}
          >
            {zone.n}
          </button>
        ))}
      </div>

      {!isTextMode && (
        <MatchOptionsBankEditor
          label="Options bank"
          options={options}
          minOptions={2}
          onChange={(nextOptions) => onChange({ ...group, options: nextOptions })}
        />
      )}

      {zones.map((zone, idx) => (
        <div
          key={zone.n}
          className="grid gap-2 rounded-lg border border-border bg-white p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
            {zone.n}
          </span>
          <Input
            value={zone.label}
            onChange={(e) => {
              const nextZones = [...zones];
              nextZones[idx] = { ...zone, label: e.target.value };
              onChange({ ...group, zones: nextZones });
            }}
            placeholder={isTextMode ? "Optional context label" : "Location label"}
          />
          <span className="text-xs text-muted">
            {zone.x}%, {zone.y}%
          </span>
          <AnswerKeyField
            questionNumber={zone.n}
            answerKey={answerKey}
            onChange={onAnswerKeyChange}
            type={isTextMode ? "text" : "option"}
            options={options.map((o) => o.id)}
          />
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          const n = group.to + 1;
          onChange({
            ...group,
            to: n,
            zones: [...zones, { n, x: 50, y: 50, label: "" }],
          });
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add zone
      </Button>
    </div>
  );
}
