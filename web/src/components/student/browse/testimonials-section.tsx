"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getMarketingTestimonials } from "@/lib/api/marketing";

type TestimonialItem = {
  id: string;
  quote: string;
  name: string;
  initials: string;
  band: number | null;
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TestimonialsSection() {
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getMarketingTestimonials()
      .then((data) => {
        if (!active) return;
        setItems(
          data.map((t) => ({
            id: t.id,
            quote: t.quote,
            name: t.name,
            initials: initialsOf(t.name),
            band: t.band,
          })),
        );
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <h2 className="text-xl font-bold text-navy">What students say</h2>
      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading reviews…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
          Published student reviews will appear here after mocks are completed
          and students share feedback.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-xl border border-border bg-white p-5 shadow-sm"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
                    {item.initials}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                </div>
                {item.band != null && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Band {item.band}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
