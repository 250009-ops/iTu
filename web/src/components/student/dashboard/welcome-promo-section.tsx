"use client";

import { useState } from "react";
import { BookOpen, Gift, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import { WelcomePromoClaimModal } from "@/components/student/dashboard/welcome-promo-claim-modal";
import { cn } from "@/lib/utils";

type WelcomePromo = NonNullable<
  ReturnType<typeof useStudentDashboardData>["data"]
>["welcomePromos"][number];

const skillStyles = {
  listening: {
    card: "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
    badge: "bg-sky-100 text-sky-800",
    icon: "text-sky-600",
    button: "border-sky-200 bg-white text-sky-900 hover:bg-sky-100",
  },
  reading: {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
    badge: "bg-emerald-100 text-emerald-800",
    icon: "text-emerald-600",
    button: "border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-100",
  },
} as const;

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function PromoCard({
  promo,
  onClaim,
}: {
  promo: WelcomePromo;
  onClaim: (promo: WelcomePromo) => void;
}) {
  const styles = skillStyles[promo.skill];
  const Icon = promo.skill === "listening" ? Headphones : BookOpen;

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 rounded-xl border p-4 sm:p-5",
        styles.card,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm",
              styles.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-navy">Welcome gift</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                  styles.badge,
                )}
              >
                Free
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {promo.title}
            </p>
            <p className="mt-1 text-sm text-muted">{promo.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          Offer ends {formatExpiry(promo.expiresAt)}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className={cn("w-full sm:w-auto", styles.button)}
          onClick={() => onClaim(promo)}
        >
          Claim free mock
        </Button>
      </div>
    </div>
  );
}

export function WelcomePromoSection() {
  const { data } = useStudentDashboardData();
  const [selectedPromo, setSelectedPromo] = useState<WelcomePromo | null>(null);

  const promos =
    data?.welcomePromos?.filter((promo) => promo.eligible && !promo.claimed) ??
    [];

  if (promos.length === 0) return null;

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-navy">
            Your welcome gifts
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {promos.map((promo) => (
            <PromoCard
              key={promo.skill}
              promo={promo}
              onClaim={setSelectedPromo}
            />
          ))}
        </div>
      </section>

      {selectedPromo ? (
        <WelcomePromoClaimModal
          promo={selectedPromo}
          onClose={() => setSelectedPromo(null)}
        />
      ) : null}
    </>
  );
}
