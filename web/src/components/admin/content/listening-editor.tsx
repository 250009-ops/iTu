"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { listeningParts } from "@/lib/admin/constants";
import { ContentTestEditor } from "@/components/admin/content/content-test-editor";
import { useAdminContent } from "@/contexts/admin-content-context";
import { getContentTest, uploadListeningMedia } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type AssetMap = Record<string, { url: string; sizeBytes: number | null }>;

export function ListeningAudioUpload({
  testId,
  onUploaded,
  onMediaUpdated,
}: {
  testId: string;
  onUploaded?: () => void;
  onMediaUpdated?: () => void;
}) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<AssetMap>({});
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let active = true;
    setLoadingAssets(true);
    void getContentTest(testId)
      .then((test) => {
        if (!active) return;
        const map: AssetMap = {};
        for (const asset of test.mediaAssets) {
          map[asset.key] = { url: asset.url, sizeBytes: asset.sizeBytes };
        }
        setAssets(map);
      })
      .catch(() => {
        if (active) setAssets({});
      })
      .finally(() => {
        if (active) setLoadingAssets(false);
      });
    return () => {
      active = false;
    };
  }, [testId]);

  const handleUpload = useCallback(
    async (partLabel: string, partKey: string, file: File) => {
      setUploadingKey(partKey);
      try {
        const result = await uploadListeningMedia(testId, partKey, file);
        setAssets((prev) => ({
          ...prev,
          [partKey]: { url: result.url, sizeBytes: result.sizeBytes },
        }));
        toast(`${partLabel} uploaded`, { variant: "success" });
        onUploaded?.();
        onMediaUpdated?.();
      } catch (err) {
        toast("Upload failed", {
          description: getErrorMessage(err, "Check MEDIA_ROOT on the API server."),
          variant: "error",
        });
      } finally {
        setUploadingKey(null);
      }
    },
    [testId, toast, onUploaded, onMediaUpdated],
  );

  const uploadedCount = listeningParts.filter((_, i) =>
    Boolean(assets[`part-${i + 1}`]),
  ).length;

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted">
        Audio files (VPS /media/)
      </Label>
      {loadingAssets ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading audio…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {listeningParts.map((part, index) => {
            const partKey = `part-${index + 1}`;
            const asset = assets[partKey];
            const uploading = uploadingKey === partKey;

            return (
              <div key={partKey}>
                <input
                  ref={(el) => {
                    fileInputs.current[partKey] = el;
                  }}
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(part, partKey, file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputs.current[partKey]?.click()}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
                    asset
                      ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300"
                      : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                  ) : asset ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted" />
                  )}
                  <span className="text-sm font-semibold text-navy">{part}</span>
                  <span className="text-center text-[10px] text-muted">
                    {asset ? "Uploaded · replace" : "MP3 / WAV / OGG"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-sm text-sky-800">
        {uploadedCount}/4 parts uploaded — all four required before publish.
      </p>
    </div>
  );
}

export function ListeningEditor() {
  const { selectedTestId } = useAdminContent();
  return <ContentTestEditor module="listening" testId={selectedTestId} />;
}
