"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";
import { MARKETING_FAQS, type MarketingFaq } from "@/lib/marketing/data";
import { EASE } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

const CATEGORIES: Array<"All" | MarketingFaq["category"]> = [
  "All",
  "The Exam",
  "Results",
  "Examiners",
  "Technical",
  "Booking",
];

export function FaqExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [openId, setOpenId] = useState<string | null>(MARKETING_FAQS[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARKETING_FAQS.filter((f) => {
      const matchCat = category === "All" || f.category === category;
      const matchQuery =
        !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [query, category]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              category === c ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-border hover:text-navy",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        Showing {filtered.length} question{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {filtered.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white transition-colors",
                isOpen ? "border-sky-200 shadow-md" : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">
                    {faq.category}
                  </span>
                  <span className={cn("text-sm font-semibold sm:text-base", isOpen ? "text-navy" : "text-foreground")}>
                    {faq.question}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                    isOpen ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500",
                  )}
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6">{faq.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted">
            No questions match your search. Try a different keyword or category.
          </p>
        ) : null}
      </div>
    </div>
  );
}
