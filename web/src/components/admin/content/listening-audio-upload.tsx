"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Headphones, Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  getListeningAudioAsset,
  LISTENING_FULL_AUDIO_KEY,
  type MediaAssetRef,
} from "@/lib/admin/content/listening-media";
import {
  isListeningAudioWithinLimit,
  MAX_LISTENING_AUDIO_MB,
} from "@/lib/admin/content/listening-upload-limits";
import { useContentStudio } from "@/contexts/content-studio-context";
import { getErrorMessage, ApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ListeningAudioUpload({
  testId,
  onUploaded,
  onMediaUpdated,
}: {
  testId: string;
  onUploaded?: () => void;
  onMediaUpdated?: () => void;
}) {
  const { fetchTest, uploadMedia } = useContentStudio();
  const { toast } = useToast();
  const [assets, setAssets] = useState<MediaAssetRef[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoadingAssets(true);
    void fetchTest(testId)
      .then((test) => {
        if (!active) return;
        setAssets(
          (test.mediaAssets ?? []).map((a) => ({
            key: a.key,
            url: a.url,
            sizeBytes: a.sizeBytes,
          })),
        );
      })
      .catch(() => {
        if (active) setAssets([]);
      })
      .finally(() => {
        if (active) setLoadingAssets(false);
      });
    return () => {
      active = false;
    };
  }, [testId, fetchTest]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!isListeningAudioWithinLimit(file.size)) {
        toast("File too large", {
          description: `Maximum size is ${MAX_LISTENING_AUDIO_MB} MB. Compress the audio or export at a lower bitrate.`,
          variant: "error",
        });
        return;
      }

      setUploading(true);
      try {
        const result = await uploadMedia(
          testId,
          LISTENING_FULL_AUDIO_KEY,
          file,
        );
        setAssets((prev) => {
          const withoutLegacy = prev.filter(
            (a) =>
              !/^part-[1-4]$/.test(a.key) && a.key !== LISTENING_FULL_AUDIO_KEY,
          );
          return [
            ...withoutLegacy,
            {
              key: LISTENING_FULL_AUDIO_KEY,
              url: result.url,
              sizeBytes: result.sizeBytes,
            },
          ];
        });
        toast("Listening audio uploaded", {
          description: "One file covers all four parts for students.",
          variant: "success",
        });
        onUploaded?.();
        onMediaUpdated?.();
      } catch (err) {
        const description =
          err instanceof ApiError && err.status === 413
            ? `The file exceeds the server upload limit (${MAX_LISTENING_AUDIO_MB} MB). Try compressing the audio.`
            : getErrorMessage(err, "Check MEDIA_ROOT on the API server.");
        toast("Upload failed", {
          description,
          variant: "error",
        });
      } finally {
        setUploading(false);
      }
    },
    [testId, toast, onUploaded, onMediaUpdated, uploadMedia],
  );

  const audioAsset = getListeningAudioAsset(assets);
  const hasFullAudio = audioAsset?.key === LISTENING_FULL_AUDIO_KEY;
  const legacyParts = assets.filter((a) => /^part-[1-4]$/.test(a.key)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-navy">
            Listening audio (single file)
          </Label>
          <p className="mt-0.5 text-xs text-muted">
            Upload one MP3, M4A, WAV, or OGG (up to ~45 min, max{" "}
            {MAX_LISTENING_AUDIO_MB} MB). Stored on VPS at{" "}
            <code className="rounded bg-slate-100 px-1">/media/</code>.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />

      {loadingAssets ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading audio…
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex w-full items-center gap-4 rounded-xl border-2 border-dashed px-5 py-5 text-left transition-colors sm:py-6",
            audioAsset
              ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300"
              : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50",
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 shrink-0 animate-spin text-sky-600" />
          ) : audioAsset ? (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
          ) : (
            <Upload className="h-8 w-8 shrink-0 text-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy">
              {audioAsset
                ? hasFullAudio
                  ? "Full test audio uploaded"
                  : "Legacy part audio detected"
                : "Upload full listening audio"}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {audioAsset
                ? `${hasFullAudio ? "Replace file" : "Upload full-audio to replace legacy parts"}${formatFileSize(audioAsset.sizeBytes) ? ` · ${formatFileSize(audioAsset.sizeBytes)}` : ""}`
                : `One continuous recording for Parts 1–4 (up to ~45 min, max ${MAX_LISTENING_AUDIO_MB} MB)`}
            </p>
          </div>
        </button>
      )}

      {!hasFullAudio && legacyParts > 0 && (
        <p className="text-xs text-amber-700">
          This test still has {legacyParts} legacy per-part file(s). Upload a
          single full-audio file to replace them.
        </p>
      )}
    </div>
  );
}
