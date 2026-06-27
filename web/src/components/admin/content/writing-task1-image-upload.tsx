"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ImageIcon, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getWritingTask1Asset,
  mediaUrlWithCacheBust,
  stripMediaCacheBust,
  WRITING_TASK1_IMAGE_KEY,
} from "@/lib/admin/content/writing-media";
import type { MediaAssetRef } from "@/lib/admin/content/listening-media";
import { getContentTest, uploadContentMedia } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WritingTask1ImageUpload({
  testId,
  imageUrl,
  onImageUploaded,
  onMediaUpdated,
}: {
  testId: string;
  imageUrl?: string;
  onImageUploaded: (url: string) => void;
  onMediaUpdated?: () => void;
}) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<MediaAssetRef[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadGeneration, setUploadGeneration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(() => {
    setLoadingAssets(true);
    return getContentTest(testId)
      .then((test) => {
        setAssets(
          (test.mediaAssets ?? []).map((a) => ({
            key: a.key,
            url: a.url,
            sizeBytes: a.sizeBytes,
          })),
        );
      })
      .catch(() => {
        setAssets([]);
      })
      .finally(() => {
        setLoadingAssets(false);
      });
  }, [testId]);

  useEffect(() => {
    let active = true;
    void loadAssets().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [loadAssets]);

  const openFilePicker = useCallback(() => {
    if (uploading) return;
    fileInputRef.current?.click();
  }, [uploading]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const result = await uploadContentMedia(
          testId,
          WRITING_TASK1_IMAGE_KEY,
          file,
        );
        const cleanUrl = stripMediaCacheBust(result.url);
        const nextAsset: MediaAssetRef = {
          key: WRITING_TASK1_IMAGE_KEY,
          url: cleanUrl,
          sizeBytes: result.sizeBytes,
        };
        setAssets([nextAsset]);
        setUploadGeneration((g) => g + 1);
        onImageUploaded(cleanUrl);
        toast("Task 1 image uploaded", {
          description: "Students will see this chart or diagram during Writing.",
          variant: "success",
        });
        onMediaUpdated?.();
      } catch (err) {
        toast("Upload failed", {
          description: getErrorMessage(err, "Check MEDIA_ROOT on the API server."),
          variant: "error",
        });
      } finally {
        setUploading(false);
      }
    },
    [testId, toast, onImageUploaded, onMediaUpdated],
  );

  const asset = getWritingTask1Asset(assets);
  const rawPreviewUrl = imageUrl ?? asset?.url;
  const cacheVersion =
    uploadGeneration > 0
      ? `${asset?.sizeBytes ?? 0}-${uploadGeneration}`
      : asset?.sizeBytes;
  const previewUrl = mediaUrlWithCacheBust(rawPreviewUrl, cacheVersion);
  const showInitialLoader = loadingAssets && !rawPreviewUrl;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />

      {showInitialLoader ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading image…
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={openFilePicker}
          className={cn(
            "flex w-full items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 text-left transition-colors",
            rawPreviewUrl
              ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300"
              : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40",
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 shrink-0 animate-spin text-violet-600" />
          ) : rawPreviewUrl ? (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
          ) : (
            <Upload className="h-8 w-8 shrink-0 text-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy">
              {rawPreviewUrl ? "Task 1 image uploaded" : "Upload Task 1 image"}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {rawPreviewUrl
                ? `Click to replace image${formatFileSize(asset?.sizeBytes) ? ` · ${formatFileSize(asset?.sizeBytes)}` : ""}`
                : "JPEG, PNG, or WebP — chart, graph, map, or process diagram"}
            </p>
          </div>
        </button>
      )}

      {previewUrl && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted" />
              <Label className="text-xs font-medium text-muted">Preview</Label>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={uploading}
              disabled={uploading}
              onClick={openFilePicker}
            >
              <Upload className="h-3.5 w-3.5" />
              Replace
            </Button>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={openFilePicker}
            className="group relative block w-full cursor-pointer disabled:cursor-wait"
            title="Click to replace image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={previewUrl}
              src={previewUrl}
              alt="Task 1 visual preview"
              className="max-h-64 w-full object-contain bg-slate-50 p-3"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
              Replace image
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
