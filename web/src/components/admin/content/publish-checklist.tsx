"use client";

import { CheckCircle2, Circle } from "lucide-react";
import {
  allChecklistOk,
  buildPublishChecklist,
  type ChecklistItem,
} from "@/lib/admin/content/utils";
import type { ContentModule } from "@/lib/admin/types";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { MediaAssetRef } from "@/lib/admin/content/listening-media";
import { cn } from "@/lib/utils";

type Props = {
  module: ContentModule;
  content: object;
  answerKey: AnswerKeyMap;
  mediaAssets?: MediaAssetRef[];
};

export function PublishChecklist({
  module,
  content,
  answerKey,
  mediaAssets = [],
}: Props) {
  const items = buildPublishChecklist(module, content, answerKey, mediaAssets);
  const ready = allChecklistOk(items);

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        ready ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/40",
      )}
    >
      <p className="text-sm font-semibold text-navy">
        {ready ? "Ready to publish" : "Before you publish"}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <ChecklistRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const Icon = item.ok ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", item.ok ? "text-emerald-600" : "text-amber-600")}
      />
      <div>
        <span className={item.ok ? "text-slate-700" : "font-medium text-navy"}>{item.label}</span>
        {!item.ok && item.hint && (
          <p className="mt-0.5 text-xs text-muted">{item.hint}</p>
        )}
      </div>
    </li>
  );
}

export function isPublishReady(
  module: ContentModule,
  content: object,
  answerKey: AnswerKeyMap,
  mediaAssets: MediaAssetRef[] = [],
): boolean {
  return allChecklistOk(buildPublishChecklist(module, content, answerKey, mediaAssets));
}
