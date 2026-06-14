"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setLoading(true);
    try {
      // TODO: wire to auth API
      await new Promise((r) => setTimeout(r, 900));
      setSubmittedEmail(data.email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm sm:p-10">
        {!sent ? (
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
                Reset password
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                Enter your email and we&apos;ll send reset instructions.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

              <Button
                type="submit"
                variant="danger"
                className="w-full"
                size="lg"
                loading={loading}
              >
                Send reset link
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-5 py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-navy">Check your email</h2>
              <p className="text-sm text-muted leading-relaxed">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{submittedEmail}</span>,
                you will receive password reset instructions shortly.
              </p>
            </div>
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Return to sign in
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
