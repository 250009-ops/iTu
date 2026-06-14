import { Star } from "lucide-react";
import type { Testimonial } from "@/lib/marketing/data";
import { Avatar } from "@/components/marketing/ui/primitives";

export function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Band {item.band}
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
        &ldquo;{item.quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Avatar initials={item.initials} size="sm" />
        <div>
          <p className="text-sm font-semibold text-foreground">{item.name}</p>
          <p className="text-xs text-muted">{item.country}</p>
        </div>
      </div>
    </div>
  );
}
