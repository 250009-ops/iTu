"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/errors";
import { getErrorMessage } from "@/lib/api/errors";
import { resendEmailVerification, verifyEmail } from "@/lib/api/auth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "verifying" }
    | { type: "verified" }
    | { type: "error"; message: string }
  >({ type: "idle" });

  const [resendEmail, setResendEmail] = useState("");
  const resendDisabled = useMemo(() => resendEmail.trim().length < 3 || loading, [resendEmail, loading]);

  useEffect(() => {
    if (!token) {
      setStatus({ type: "error", message: "Missing verification token." });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setStatus({ type: "verifying" });

    verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setStatus({ type: "verified" });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : getErrorMessage(err, "Verification failed.");
        setStatus({ type: "error", message: msg });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onResend() {
    setLoading(true);
    try {
      await resendEmailVerification(resendEmail);
      setStatus({
        type: "error",
        message: "If that email exists, we sent a new verification link.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: getErrorMessage(err, "Could not resend verification email."),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Verify your email
        </h1>
        <p className="text-sm text-muted">
          iTestU won’t let you sign in until your email is verified.
        </p>
      </div>

      {status.type === "verifying" && (
        <div className="rounded-xl border border-border bg-white p-5 text-sm text-muted">
          Verifying…
        </div>
      )}

      {status.type === "verified" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-semibold text-navy">Email verified</p>
          <p className="mt-2 text-sm text-muted">
            You can now sign in to iTestU using your email and password.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1"
              onClick={() => router.push("/login")}
              disabled={loading}
            >
              Sign in
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => router.push("/")}
              disabled={loading}
            >
              Back to site
            </Button>
          </div>
        </div>
      )}

      {status.type === "error" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {status.message}
          </div>

          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm font-semibold text-navy">
              Resend verification link
            </p>
            <p className="mt-1 text-xs text-muted">
              If your token expired, enter your email and request a new link.
            </p>
            <div className="mt-3 space-y-3">
              <Input
                placeholder="Your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
              <Button
                className="w-full"
                onClick={onResend}
                disabled={resendDisabled}
              >
                Send new link
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-muted">
        Didn&apos;t receive an email?{" "}
        <Link
          href="/contact"
          className="font-semibold text-navy underline underline-offset-2"
        >
          Contact support
        </Link>
      </p>
    </div>
  );
}

