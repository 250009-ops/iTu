"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPassword as apiResetPassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token) {
      setError("This reset link is invalid. Request a new one from the sign-in page.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiResetPassword(token, data.password);
      setDone(true);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not reset your password. The link may have expired.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm sm:p-10">
        {!done ? (
          <>
            <Link
              href="/login"
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-navy"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>

            <div className="mb-8 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-navy">
                Choose a new password
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                Enter a strong password for your account.
              </p>
            </div>

            {!token ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted">
                  This reset link is invalid or missing. Request a new one from the
                  sign-in page.
                </p>
                <Link href="/forgot-password">
                  <Button variant="secondary" className="w-full">
                    Request reset link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <FormField error={errors.password?.message} label="New password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <PasswordInput
                      {...register("password")}
                      autoComplete="new-password"
                      placeholder="New password"
                      error={!!errors.password}
                      className="pl-10"
                    />
                  </div>
                </FormField>

                <FormField error={errors.confirmPassword?.message} label="Confirm password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <PasswordInput
                      {...register("confirmPassword")}
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      error={!!errors.confirmPassword}
                      className="pl-10"
                    />
                  </div>
                </FormField>

                <Button
                  type="submit"
                  variant="danger"
                  className="w-full"
                  size="lg"
                  loading={loading}
                >
                  Update password
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="space-y-5 py-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-navy">Password updated</h2>
              <p className="text-sm leading-relaxed text-muted">
                Your password has been changed. You can now sign in with your new
                password.
              </p>
            </div>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted shadow-sm">
          Loading…
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}
