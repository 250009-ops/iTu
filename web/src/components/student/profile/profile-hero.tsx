"use client";

import {
  Bell,
  Camera,
  Mail,
  MapPin,
  Shield,
  Target,
  User,
} from "lucide-react";
import { getInitials, useAuth } from "@/hooks/use-auth";
import { useStudentProfileData } from "@/contexts/student-profile-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type ProfileTab = "overview" | "plan" | "security" | "notifications";

const navyGradient =
  "linear-gradient(135deg, #0a1628 0%, #1B2A4A 60%, #1e3a70 100%)";

const dotTexture = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
  backgroundSize: "28px 28px",
};

const marketplaceTabs: { id: ProfileTab; label: string; icon: typeof User }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "plan", label: "IELTS Plan", icon: Target },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const institutionTabs: { id: ProfileTab; label: string; icon: typeof User }[] = [
  { id: "overview", label: "Account", icon: User },
  { id: "plan", label: "IELTS Goal", icon: Target },
  { id: "security", label: "Security", icon: Shield },
];

type ProfileHeroProps = {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  portal?: "marketplace" | "institution";
  /** Shown in the hero subtitle for centre students (e.g. centre name). */
  institutionLabel?: string;
};

export function ProfileHero({
  activeTab,
  onTabChange,
  portal = "marketplace",
  institutionLabel,
}: ProfileHeroProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const { profile } = useStudentProfileData();
  if (!profile) return null;
  const name = session?.name ?? profile.name;
  const { candidateType, memberSince, heroStats, contact } = profile;
  const country = profile.country?.trim();
  const tabs = portal === "institution" ? institutionTabs : marketplaceTabs;
  const subtitle =
    portal === "institution" && institutionLabel
      ? `${institutionLabel} · Member since ${memberSince}`
      : `${candidateType} · Member since ${memberSince}`;
  const statusLabel = portal === "institution" ? "Centre student" : "Active";

  return (
    <div className="relative text-white" style={{ background: navyGradient }}>
      <div className="absolute inset-0 opacity-[0.04]" style={dotTexture} />
      <div className="relative mx-auto max-w-6xl px-6 pt-8 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-5">
            <div className="relative shrink-0">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl font-black text-white"
                style={{
                  background: "linear-gradient(135deg, #2d4a8a, #1B2A4A)",
                  fontSize: "28px",
                }}
              >
                {getInitials(name)}
              </div>
              <button
                type="button"
                aria-label="Change profile photo"
                onClick={() =>
                  toast("Photo upload", {
                    description: "Profile photo uploads are coming soon.",
                    variant: "info",
                  })
                }
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1B2A4A] bg-white text-gray-600 shadow hover:bg-gray-50"
              >
                <Camera size={13} />
              </button>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2
                  className="font-black"
                  style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
                >
                  {name}
                </h2>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-semibold text-emerald-300" style={{ fontSize: "11px" }}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-blue-200" style={{ fontSize: "14px" }}>
                {subtitle}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-blue-300" style={{ fontSize: "13px" }}>
                {contact.email ? (
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} />
                    {contact.email}
                  </span>
                ) : null}
                {country ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {country}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[80px] rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-center"
              >
                <p
                  className={cn(
                    "font-black",
                    stat.highlight ? "text-emerald-400" : "text-white",
                  )}
                  style={{ fontSize: "20px", lineHeight: 1 }}
                >
                  {stat.value}
                </p>
                <p className="text-blue-300" style={{ fontSize: "10px" }}>
                  {stat.label}
                </p>
                <p className="text-blue-300/70" style={{ fontSize: "10px" }}>
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex border-t border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-5 py-3 font-semibold transition-colors",
                activeTab === tab.id
                  ? "border-white text-white"
                  : "border-transparent text-white/45 hover:text-white/70",
              )}
              style={{ fontSize: "13px" }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
