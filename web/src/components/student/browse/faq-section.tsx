"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { browseFaqs } from "@/lib/student/constants";
import { cn } from "@/lib/utils";

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>("pause");

  return (
    <section className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-navy">Frequently Asked Questions</h2>
      <p className="mt-1 text-sm text-muted">
        Everything you need to know before booking
      </p>

      <div className="mt-6 divide-y divide-border">
        {browseFaqs.map((faq) => {
          const isOpen = openId === faq.id;

          return (
            <div key={faq.id} className="py-4">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-start justify-between gap-4 text-left"
                aria-expanded={isOpen}
              >
                <span
                  className={cn(
                    "text-sm font-semibold sm:text-base",
                    isOpen ? "text-sky-700" : "text-foreground",
                  )}
                >
                  {faq.question}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                    isOpen ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500",
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>
              {isOpen && (
                <p className="mt-3 pr-12 text-sm leading-relaxed text-muted">
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
