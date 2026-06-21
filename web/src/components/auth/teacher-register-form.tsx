"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  FileUp,
  Mail,
  User,
  X,
} from "lucide-react";
import { AuthBackLink } from "@/components/auth/auth-back-link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { registerTeacher } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import {
  TEACHER_BAND_OPTIONS,
  TEACHER_LANGUAGE_OPTIONS,
  teacherRegisterSchema,
  teacherRegisterSteps,
  type TeacherRegisterFormValues,
} from "@/lib/validations/teacher-register";
import { cn } from "@/lib/utils";

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {teacherRegisterSteps.map((step, index) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done && "bg-emerald-500 text-white",
                  active && !done && "bg-navy text-white",
                  !active && !done && "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[11px] font-medium sm:block",
                  active ? "text-navy" : "text-muted",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < teacherRegisterSteps.length - 1 && (
              <div
                className={cn(
                  "mb-5 h-px flex-1",
                  done ? "bg-emerald-300" : "bg-slate-200",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function TeacherRegisterForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);

  const form = useForm<TeacherRegisterFormValues>({
    resolver: zodResolver(teacherRegisterSchema),
    defaultValues: {
      ieltsWritingBand: "7.5",
      ieltsSpeakingBand: "7.5",
      languages: ["English"],
      acceptTerms: false,
    },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;

  const languages = watch("languages");
  const acceptTerms = watch("acceptTerms");
  const values = watch();

  const step3Ready = certificates.length > 0 && acceptTerms === true;

  async function validateStep(targetStep: number) {
    const fieldsByStep: Record<number, (keyof TeacherRegisterFormValues)[]> = {
      1: ["fullName", "email", "password", "confirmPassword"],
      2: ["ieltsWritingBand", "ieltsSpeakingBand", "yearsExperience", "languages"],
      3: ["acceptTerms"],
    };

    const fields = fieldsByStep[targetStep - 1] ?? [];
    const valid = await trigger(fields);
    if (targetStep === 3 && certificates.length === 0) {
      setError("Upload at least one qualification certificate (PDF or image).");
      return false;
    }
    setError(null);
    return valid;
  }

  async function goNext() {
    const valid = await validateStep(step);
    if (!valid) return;
    setStep((s) => Math.min(s + 1, 4));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  function toggleLanguage(value: (typeof TEACHER_LANGUAGE_OPTIONS)[number]) {
    const next = languages.includes(value)
      ? languages.filter((l) => l !== value)
      : [...languages, value];
    setValue("languages", next, { shouldValidate: true });
  }

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const next = [...certificates, ...Array.from(files)].slice(0, 5);
    setCertificates(next);
    setError(null);
  }

  async function onSubmit(data: TeacherRegisterFormValues) {
    if (certificates.length === 0) {
      setError("Upload at least one qualification certificate.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await registerTeacher(data, certificates);
      setSubmitted({ email: result.email });
    } catch (err) {
      setError(getErrorMessage(err, "Application failed. Please try again."));
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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-navy">
            Application submitted
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Thank you, <strong className="text-navy">{values.fullName}</strong>.
            Your teacher application has been sent to our admin team for review.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            We sent a confirmation to <strong className="text-navy">{submitted.email}</strong>.
            You will receive another email from <strong className="text-navy">noreply@itestu.uz</strong> when
            your account is approved — usually within 1–2 business days. You cannot sign in until then.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
            >
              Back to sign in
            </Link>
            <Link
              href="/for-teachers"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-white px-5 text-sm font-semibold text-navy transition-colors hover:bg-slate-50"
            >
              Learn about teaching
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
          Teacher application
        </h1>
        <p className="text-sm text-muted">
          Submit your IELTS scores and certificates. You can complete your profile after
          approval.
        </p>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-border bg-slate-50/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy">
              <User className="h-4 w-4" />
              Account details
            </div>
            <FormField error={errors.fullName?.message}>
              <Input {...register("fullName")} placeholder="Full name" error={!!errors.fullName} />
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
                placeholder="Password"
                error={!!errors.password}
              />
            </FormField>
            <FormField error={errors.confirmPassword?.message}>
              <PasswordInput
                {...register("confirmPassword")}
                autoComplete="new-password"
                placeholder="Confirm password"
                error={!!errors.confirmPassword}
              />
            </FormField>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 rounded-2xl border border-border bg-slate-50/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Award className="h-4 w-4" />
              IELTS scores & experience
            </div>
            <p className="text-xs text-muted">
              Minimum band <strong className="text-navy">7.5</strong> in both Writing and
              Speaking is required. All teachers grade Writing and conduct Speaking.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="IELTS Writing band" error={errors.ieltsWritingBand?.message}>
                <Select {...register("ieltsWritingBand")} error={!!errors.ieltsWritingBand}>
                  {TEACHER_BAND_OPTIONS.map((band) => (
                    <option key={band} value={band}>
                      Band {band}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="IELTS Speaking band" error={errors.ieltsSpeakingBand?.message}>
                <Select {...register("ieltsSpeakingBand")} error={!!errors.ieltsSpeakingBand}>
                  {TEACHER_BAND_OPTIONS.map((band) => (
                    <option key={band} value={band}>
                      Band {band}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField
              label="Years of IELTS teaching / examining experience"
              error={errors.yearsExperience?.message}
            >
              <Input
                {...register("yearsExperience")}
                type="number"
                min={1}
                max={50}
                placeholder="e.g. 5"
                error={!!errors.yearsExperience}
              />
            </FormField>
            <FormField label="Languages spoken" error={errors.languages?.message}>
              <div className="flex flex-wrap gap-2">
                {TEACHER_LANGUAGE_OPTIONS.map((lang) => {
                  const selected = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        selected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-border bg-white text-muted hover:border-slate-300",
                      )}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 rounded-2xl border border-border bg-slate-50/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy">
              <FileUp className="h-4 w-4" />
              Credentials
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-navy">
                Qualification certificates
              </p>
              <p className="mb-3 text-xs text-muted">
                Upload CELTA, DELTA, examiner certification, or equivalent (PDF, JPG,
                PNG — up to 5 files, 10 MB each).
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 transition-colors hover:border-navy/30 hover:bg-slate-50">
                <FileUp className="h-8 w-8 text-slate-400" />
                <span className="mt-2 text-sm font-semibold text-navy">
                  Click to upload certificates
                </span>
                <span className="mt-1 text-xs text-muted">or drag and drop</span>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
              </label>
              {certificates.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {certificates.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-sm"
                    >
                      <span className="truncate text-navy">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCertificates((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="ml-2 text-muted hover:text-brand-red"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Checkbox
              {...register("acceptTerms")}
              label={
                <>
                  I agree to the{" "}
                  <Link href="/terms" className="text-navy underline underline-offset-2">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-navy underline underline-offset-2">
                    Privacy Policy
                  </Link>
                </>
              }
            />
            {errors.acceptTerms && (
              <p className="text-xs font-medium text-red-600">{errors.acceptTerms.message}</p>
            )}
            {!step3Ready && (
              <p className="text-xs text-muted">
                Upload at least one certificate and accept the terms to continue.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-navy">Review your application</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Name</dt>
                <dd className="mt-0.5 font-medium text-navy">{values.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Email</dt>
                <dd className="mt-0.5 font-medium text-navy">{values.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Writing</dt>
                <dd className="mt-0.5 font-medium text-navy">Band {values.ieltsWritingBand}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Speaking</dt>
                <dd className="mt-0.5 font-medium text-navy">Band {values.ieltsSpeakingBand}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Experience</dt>
                <dd className="mt-0.5 font-medium text-navy">{values.yearsExperience} years</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Role</dt>
                <dd className="mt-0.5 font-medium text-navy">Writing & Speaking</dd>
              </div>
            </dl>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Languages</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-navy"
                  >
                    {lang}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Certificates</dt>
              <dd className="mt-1 text-sm text-navy">{certificates.length} file(s) attached</dd>
            </div>
            <p className="rounded-lg bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
              After approval you can sign in and complete your teacher profile. We will
              email you when your application is reviewed.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              variant="primary"
              className="flex-1 sm:flex-none"
              disabled={step === 3 && !step3Ready}
              onClick={goNext}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" variant="primary" className="flex-1 sm:flex-none" loading={loading}>
              Submit application
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-navy underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
