"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { MarketingFaq } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";
import { EASE } from "@/components/marketing/motion/reveal";

export function FaqAccordion({
  faqs,
  showCategory = false,
  defaultOpenId,
}: {
  faqs: MarketingFaq[];
  showCategory?: boolean;
  defaultOpenId?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(
    defaultOpenId ?? faqs[0]?.id ?? null,
  );

  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq) => {
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
                {showCategory ? (
                  <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">
                    {faq.category}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "text-sm font-semibold sm:text-base",
                    isOpen ? "text-navy" : "text-foreground",
                  )}
                >
                  {faq.question}
                </span>
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  isOpen ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                />
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
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6">
                    {faq.answer}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
