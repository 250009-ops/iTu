"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getMe, login as apiLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { getErrorMessage } from "@/lib/api/errors";
import {
  getDashboardPath,
  normalizeRole,
  setSession,
} from "@/lib/auth/session";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";

const SESSION_MESSAGES: Record<string, string> = {
  session_expired: "Your session has expired. Please sign in again.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const sessionReason = searchParams.get("reason");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    setAuthError(null);

    try {
      const response = await apiLogin(data.email, data.password);
      const verified = await getMe(response.accessToken);
      const role = normalizeRole(verified.role);

      setSession(
        {
          accessToken: response.accessToken,
          role,
          email: verified.email,
          name: verified.name,
        },
        { rememberMe: data.rememberMe ?? false },
      );

      router.push(response.dashboardPath ?? getDashboardPath(role));
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        setAuthError(
          "Cannot reach the server. Check your connection and try again, or contact support if the problem continues.",
        );
        return;
      }

      setAuthError(
        getErrorMessage(
          error,
          "Invalid email or password. Try admin / admin for demo access.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between lg:hidden">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Welcome back
        </h1>
        <p className="text-muted">Sign in to continue to your dashboard.</p>
      </div>

      {registered && (
        <div
          className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Account created successfully. Sign in with your email and password.
          </p>
        </div>
      )}

      {sessionReason && SESSION_MESSAGES[sessionReason] && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="status"
        >
          {SESSION_MESSAGES[sessionReason]}
        </div>
      )}

      {authError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              {...register("email")}
              type="text"
              autoComplete="username"
              placeholder="Email address"
              error={!!errors.email}
              className="pl-10"
              aria-invalid={!!errors.email}
            />
          </div>
        </FormField>

        <FormField error={errors.password?.message}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10" />
            <PasswordInput
              {...register("password")}
              autoComplete="current-password"
              placeholder="Password"
              error={!!errors.password}
              className="pl-10"
              aria-invalid={!!errors.password}
            />
          </div>
        </FormField>

        <div className="flex items-center justify-between gap-4">
          <Checkbox {...register("rememberMe")} label="Remember me" />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-red hover:text-brand-red-hover focus-visible:outline-none focus-visible:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign In
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <div className="rounded-lg border border-dashed border-border bg-slate-50 px-3 py-2.5 text-center text-xs text-muted">
        <span className="font-medium text-foreground">Demo:</span>{" "}
        student · teacher · admin{" "}
        <span className="text-slate-400">(same as password)</span>
      </div>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-red hover:text-brand-red-hover focus-visible:outline-none focus-visible:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
