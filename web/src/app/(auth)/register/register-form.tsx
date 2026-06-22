"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, User } from "lucide-react";
import { AuthBackLink } from "@/components/auth/auth-back-link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { register as apiRegister } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import {
  BAND_OPTIONS,
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      examType: "academic",
      targetBand: "7.0",
      acceptTerms: false,
    },
  });

  const examType = watch("examType");

  async function onSubmit(data: RegisterFormValues) {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRegister({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        targetBand: parseFloat(data.targetBand),
        examType: data.examType,
        acceptTerms: data.acceptTerms,
      });
      setSubmitted({ email: response.email });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="lg:hidden">
          <Logo />
        </div>

        <AuthBackLink href="/register" label="Back to account type" />

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-navy">
            Verify your email
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            We sent a verification link to{" "}
            <strong className="text-navy">{submitted.email}</strong>.
            <br />
            Please click the link to finish sign-up before signing in.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="primary"
                className="w-full sm:w-auto"
                disabled={loading}
              >
                Go to sign in
              </Button>
            </Link>
            <Link href="/for-students" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={loading}
              >
                Learn about mocks
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <Logo />
      </div>

      <AuthBackLink href="/register" label="Back to account type" />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Student registration
        </h1>
        <p className="text-muted">Create your account to book and take IELTS mocks</p>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField error={errors.fullName?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              {...register("fullName")}
              autoComplete="name"
              placeholder="Full name"
              error={!!errors.fullName}
              className="pl-10"
            />
          </div>
        </FormField>

        <FormField error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="Email address"
              error={!!errors.email}
              className="pl-10"
            />
          </div>
        </FormField>

        <FormField
          error={errors.password?.message}
          hint="Minimum 8 characters with uppercase and number"
        >
          <PasswordInput
            {...register("password")}
            autoComplete="new-password"
            placeholder="Password (min 8 chars)"
            error={!!errors.password}
          />
        </FormField>

        <FormField label="Target band score" error={errors.targetBand?.message}>
          <Select {...register("targetBand")} error={!!errors.targetBand}>
            {BAND_OPTIONS.map((band) => (
              <option key={band} value={band}>
                Band {band}
              </option>
            ))}
          </Select>
        </FormField>

        <fieldset className="space-y-2">
          <legend className="sr-only">Exam type</legend>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-colors",
              examType === "academic"
                ? "border-navy bg-navy/5 ring-1 ring-navy/20"
                : "border-border hover:border-slate-300",
            )}
          >
            <input
              type="radio"
              value="academic"
              {...register("examType")}
              className="h-4 w-4 border-border text-navy focus:ring-navy/30"
            />
            <span className="text-sm font-medium text-foreground">
              Academic
              <span className="ml-1.5 font-normal text-muted">
                (General Training coming soon)
              </span>
            </span>
          </label>
        </fieldset>

        <div className="space-y-1">
          <Checkbox
            {...register("acceptTerms")}
            label={
              <>
                I agree to the{" "}
                <Link href="/terms" className="text-navy underline underline-offset-2 hover:text-brand-red">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-navy underline underline-offset-2 hover:text-brand-red">
                  Privacy Policy
                </Link>
              </>
            }
          />
          {errors.acceptTerms && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create student account
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Applying as a teacher?{" "}
        <Link href="/register/teacher" className="font-semibold text-navy underline underline-offset-2">
          Teacher application
        </Link>
      </p>
    </div>
  );
}
