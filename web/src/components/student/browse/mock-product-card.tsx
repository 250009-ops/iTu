"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format-price";
import {
  BookOpen,
  Check,
  Clock,
  Globe,
  Headphones,
  Lock,
  Mic,
  PenLine,
  Shield,
  Star,
  TrendingUp,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingWizard } from "@/components/student/browse/booking-wizard";
import type { BrowseProduct } from "@/lib/api/mappers/student";
import { cn } from "@/lib/utils";

const skillIcons = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
} as const;

const skillStyles = {
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-100",
    badge: "bg-sky-100 text-sky-800",
    icon: "text-sky-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    badge: "bg-emerald-100 text-emerald-800",
    icon: "text-emerald-600",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-100",
    badge: "bg-violet-100 text-violet-800",
    icon: "text-violet-600",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    badge: "bg-rose-100 text-rose-800",
    icon: "text-rose-600",
  },
};

const highlightIcons = {
  clock: Clock,
  user: User,
  check: Check,
  globe: Globe,
  chart: TrendingUp,
};

export function BrowsePageHeader() {
  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
        <Check className="h-3.5 w-3.5" />
        Official computer-delivered IELTS format
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        Browse Mock Exams
      </h1>
      <p className="text-muted">
        Expert human grading · Results within 24 hours · Pick your certified
        examiner
      </p>
    </div>
  );
}

export function MockProductCard({
  product,
  autoOpenBooking = false,
  onBookingOpened,
  initialWritingTeacherId,
  initialSpeakingTeacherId,
  mode = "student",
  grantSetTitle,
  grantSource,
  onEnrollClick,
  onBuyClick,
  buying = false,
}: {
  product: BrowseProduct;
  autoOpenBooking?: boolean;
  onBookingOpened?: () => void;
  initialWritingTeacherId?: string | null;
  initialSpeakingTeacherId?: string | null;
  mode?: "student" | "institution" | "institutionShop";
  grantSetTitle?: string;
  grantSource?: "ADMIN_GRANT" | "PURCHASE";
  onEnrollClick?: () => void;
  onBuyClick?: () => void;
  buying?: boolean;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const isInstitution = mode === "institution";
  const isInstitutionShop = mode === "institutionShop";
  const showPrice = mode === "student" || isInstitutionShop;

  useEffect(() => {
    if (autoOpenBooking) {
      setWizardOpen(true);
      onBookingOpened?.();
    }
  }, [autoOpenBooking, onBookingOpened]);

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {/* Hero */}
      <div className="bg-navy px-6 py-6 text-white sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-500/90 px-3 py-0.5 text-xs font-semibold">
                {product.examType}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium text-slate-200">
                {product.delivery}
              </span>
              {product.mostPopular && mode === "student" && (
                <span className="rounded-full bg-amber-500/90 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              {isInstitutionShop && (
                <span className="rounded-full bg-emerald-500/90 px-3 py-0.5 text-xs font-semibold">
                  B2B mock set
                </span>
              )}
              {isInstitution && grantSetTitle && (
                <span className="rounded-full bg-emerald-500/90 px-3 py-0.5 text-xs font-semibold">
                  Set: {grantSetTitle}
                </span>
              )}
              {isInstitution && grantSource === "PURCHASE" && (
                <span className="rounded-full bg-sky-500/90 px-3 py-0.5 text-xs font-semibold">
                  Purchased
                </span>
              )}
              {isInstitution && grantSource === "ADMIN_GRANT" && (
                <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium text-slate-200">
                  Granted by iTestU
                </span>
              )}
              {mode === "student" &&
                product.reviewCount > 0 &&
                product.rating != null && (
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < Math.round(product.rating)
                            ? "fill-current"
                            : "fill-none opacity-40",
                        )}
                      />
                    ))}
                    <span className="ml-1 text-xs font-medium text-slate-300">
                      {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                    </span>
                  </div>
                )}
            </div>
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">{product.title}</h2>
              <p className="mt-1.5 text-sm text-slate-400">{product.description}</p>
            </div>
          </div>
          {showPrice && (
            <div className="shrink-0 text-left lg:text-right">
              <p className="text-3xl font-bold">
                {formatPrice(product.price, product.currency)}
              </p>
              <p className="text-sm text-slate-400">
                {isInstitutionShop ? "per set" : "per attempt"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {isInstitutionShop
                  ? "Unlimited student enrollments"
                  : "No hidden fees"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Skills grid */}
      <div className="grid grid-cols-1 divide-y border-b border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:divide-y-0">
        {product.skills.map((skill) => {
          const Icon = skillIcons[skill.id as keyof typeof skillIcons];
          const style = skillStyles[skill.color];

          return (
            <div
              key={skill.id}
              className={cn("p-5", style.bg, "border-b border-border last:border-b-0 sm:border-b-0 lg:border-r lg:last:border-r-0")}
            >
              <Icon className={cn("h-5 w-5", style.icon)} strokeWidth={1.75} />
              <p className="mt-2 font-semibold text-foreground">{skill.name}</p>
              <p className="mt-0.5 text-xs text-muted">{skill.detail}</p>
              <span
                className={cn(
                  "mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  style.badge,
                )}
              >
                {skill.badge}
              </span>
            </div>
          );
        })}
      </div>

      {/* Included & rules */}
      <div className="grid grid-cols-1 gap-6 border-b border-border p-6 sm:p-8 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold text-navy">What&apos;s included</h3>
          <ul className="mt-4 space-y-2.5">
            {product.included.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-navy">Exam rules</h3>
          <ul className="mt-4 space-y-2.5">
            {product.rules.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Highlights */}
      <div className="flex flex-wrap gap-4 border-b border-border px-6 py-4 sm:px-8">
        {product.highlights.map((item) => {
          const Icon = highlightIcons[item.icon];
          return (
            <div
              key={item.label}
              className="flex items-center gap-2 text-xs text-muted sm:text-sm"
            >
              <Icon className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
              {item.label}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="flex flex-col items-stretch gap-3 p-6 sm:flex-row sm:items-center sm:p-8">
        <Button
          variant="danger"
          size="lg"
          className="flex-1 sm:max-w-md"
          loading={buying}
          onClick={() => {
            if (isInstitutionShop) onBuyClick?.();
            else if (isInstitution) onEnrollClick?.();
            else setWizardOpen(true);
          }}
        >
          {isInstitutionShop
            ? "Buy mock set"
            : isInstitution
              ? "Enroll students"
              : product.bookCta}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {(mode === "student" || isInstitutionShop) && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted sm:justify-start">
            <Lock className="h-3.5 w-3.5" />
            Pay securely with international Visa cards (including Uzum Bank Visa)
          </p>
        )}
      </div>

    </div>
    {!isInstitution && !isInstitutionShop && wizardOpen && (
      <BookingWizard
        product={product}
        onClose={() => setWizardOpen(false)}
        initialWritingTeacherId={initialWritingTeacherId}
        initialSpeakingTeacherId={initialSpeakingTeacherId}
      />
    )}
    </>
  );
}
