"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Headphones, Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { uploadPracticeUnitMedia } from "@/lib/api/admin";
import {
  isListeningAudioWithinLimit,
  MAX_LISTENING_AUDIO_MB,
} from "@/lib/admin/content/listening-upload-limits";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Props = {
  unitId: string;
  onUploaded?: () => void;
};

export function PracticeListeningAudioUpload({ unitId, onUploaded }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (!isListeningAudioWithinLimit(file.size)) {
      toast("File too large", {
        description: `Maximum size is ${MAX_LISTENING_AUDIO_MB} MB.`,
        variant: "error",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadPracticeUnitMedia(unitId, "full-audio", file);
      setUploaded(true);
      toast("Listening audio uploaded", { variant: "success" });
      onUploaded?.();
    } catch {
      toast("Upload failed", { variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-navy">Section audio</Label>
          <p className="mt-0.5 text-xs text-muted">
            Upload one audio file for this practice unit (max {MAX_LISTENING_AUDIO_MB} MB).
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

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex w-full items-center gap-4 rounded-xl border-2 border-dashed px-5 py-5 text-left transition-colors sm:py-6",
          uploaded
            ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300"
            : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50",
        )}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 shrink-0 animate-spin text-sky-600" />
        ) : uploaded ? (
          <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
        ) : (
          <Upload className="h-8 w-8 shrink-0 text-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">
            {uploaded ? "Audio uploaded" : "Upload section audio"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {uploaded ? "Replace file if needed" : "MP3, M4A, WAV, or OGG"}
          </p>
        </div>
      </button>
    </div>
  );
}
