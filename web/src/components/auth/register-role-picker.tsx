"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, UserRound } from "lucide-react";
import { AuthBackLink } from "@/components/auth/auth-back-link";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const roles = [
  {
    href: "/register/student",
    label: "Student",
    description: "Book and take full IELTS computer-delivered mocks with examiner-graded results.",
    icon: UserRound,
    accent: "group-hover:border-sky-300 group-hover:bg-sky-50/80",
    iconWrap: "bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white",
  },
  {
    href: "/register/teacher",
    label: "Teacher",
    description: "Apply as a certified examiner to grade Writing and conduct Speaking sessions.",
    icon: GraduationCap,
    accent: "group-hover:border-violet-300 group-hover:bg-violet-50/80",
    iconWrap:
      "bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white",
  },
] as const;

export function RegisterRolePicker() {
  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <Logo />
      </div>

      <AuthBackLink href="/login" />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Create your account
        </h1>
        <p className="text-sm text-muted">
          Choose how you&apos;ll use iTestU — you&apos;ll complete the right form on the next
          step.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Link
              key={role.href}
              href={role.href}
              className={cn(
                "group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all",
                "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/20",
                role.accent,
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  role.iconWrap,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-bold text-navy">{role.label}</p>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                {role.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy">
                Continue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-navy underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
