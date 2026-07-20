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
import { getMe, isTwoFactorChallenge, login as apiLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { getErrorMessage } from "@/lib/api/errors";
import { getDashboardPath,
  normalizeRole,
  setSession,
} from "@/lib/auth/session";
import { isDesktopShell } from "@/lib/desktop/shim";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";

const SESSION_MESSAGES: Record<string, string> = {
  session_expired: "Your session has expired. Please sign in again.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const sessionReason = searchParams.get("reason");
  const desktop = isDesktopShell();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
    rememberMe: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  async function completeLogin(
    email: string,
    password: string,
    rememberMe: boolean,
    code?: string,
  ) {
    const response = await apiLogin(email, password, code);

    if (isTwoFactorChallenge(response)) {
      setPendingCredentials({ email, password, rememberMe });
      setTwoFactorStep(true);
      setAuthError(null);
      return;
    }

    const verified = await getMe(response.accessToken);
    const role = normalizeRole(verified.role);

    setSession(
      {
        accessToken: response.accessToken,
        role,
        email: verified.email,
        name: verified.name,
        institutionLinked: verified.institution != null,
      },
      { rememberMe },
    );

    router.push(
      response.dashboardPath ??
        (verified.role === "student" && verified.institution != null
          ? "/inst-student"
          : getDashboardPath(role)),
    );
  }

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    setAuthError(null);

    try {
      await completeLogin(
        data.email,
        data.password,
        data.rememberMe ?? false,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setAuthError(
          "Too many sign-in attempts. Please wait a minute and try again.",
        );
        return;
      }

      if (error instanceof ApiError && error.status === 0) {
        setAuthError(
          "Cannot reach the server. Check your connection and try again, or contact support if the problem continues.",
        );
        return;
      }

      setAuthError(
        getErrorMessage(
          error,
          "Invalid email or password.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingCredentials || totpCode.trim().length !== 6) {
      setAuthError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      await completeLogin(
        pendingCredentials.email,
        pendingCredentials.password,
        pendingCredentials.rememberMe,
        totpCode.trim(),
      );
    } catch (error) {
      setAuthError(
        getErrorMessage(error, "Invalid authentication code. Try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  function backToPasswordStep() {
    setTwoFactorStep(false);
    setTotpCode("");
    setPendingCredentials(null);
    setAuthError(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between lg:hidden">
        <Logo />
        {!desktop ? (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        ) : null}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          {twoFactorStep ? "Two-factor authentication" : "Welcome back"}
        </h1>
        <p className="text-muted">
          {twoFactorStep
            ? "Enter the 6-digit code from your authenticator app."
            : "Sign in to continue to your dashboard."}
        </p>
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

      {twoFactorStep ? (
        <form onSubmit={(e) => void onSubmitTotp(e)} className="space-y-5" noValidate>
          <FormField error={authError ?? undefined}>
            <Input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="text-center text-lg tracking-[0.3em]"
              aria-invalid={!!authError}
            />
          </FormField>
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Verify &amp; Sign In
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
          <button
            type="button"
            onClick={backToPasswordStep}
            className="w-full text-sm font-medium text-muted hover:text-navy"
          >
            Back to sign in
          </button>
        </form>
      ) : (
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
      )}

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
