"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function InstitutionForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h3 className="mt-4 text-xl font-bold text-navy">Request received</h3>
        <p className="mt-2 text-sm text-muted">
          Thanks — our institutions team will respond within one business day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" placeholder="Dr. Jane Smith" required />
        <Field label="Organisation" placeholder="XYZ Language Institute" required />
        <Field label="Email address" type="email" placeholder="jane@institution.edu" required />
        <Field label="Expected students / yr" type="number" placeholder="e.g. 200" />
      </div>
      <div className="mt-5">
        <label className="text-sm font-medium text-foreground">Message (optional)</label>
        <textarea
          rows={4}
          placeholder="Tell us about your requirements, timeline, or any specific questions…"
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>
      <button
        type="submit"
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-base font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5"
      >
        Request demo &amp; bulk quote <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        Or email us directly at <span className="font-semibold text-navy">institutions@ieltsmock.com</span>
      </p>
    </form>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-4 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
      />
    </div>
  );
}
