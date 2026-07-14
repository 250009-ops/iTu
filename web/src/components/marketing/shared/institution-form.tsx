"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { submitInstitutionApplication } from "@/lib/api/marketing";
import { getErrorMessage } from "@/lib/api/errors";

export function InstitutionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [expectedStudents, setExpectedStudents] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitInstitutionApplication({
        name,
        organisation,
        email,
        expectedStudents: expectedStudents || undefined,
        message: message || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        getErrorMessage(err, "Could not submit your request. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h3 className="mt-4 text-xl font-bold text-navy">Request received</h3>
        <p className="mt-2 text-sm text-muted">
          Thanks — our institutions team will review your application and email{" "}
          <span className="font-semibold text-navy">{email}</span> with next
          steps, usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-white p-6 shadow-lg sm:p-8"
    >
      <h3 className="text-lg font-bold text-navy">Partner application</h3>
      <p className="mt-1 text-sm text-muted">
        Tell us about your Edu Center. We respond within one business day.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field
          label="Your name"
          placeholder="Dr. Jane Smith"
          value={name}
          onChange={setName}
          required
        />
        <Field
          label="Organisation"
          placeholder="XYZ Language Institute"
          value={organisation}
          onChange={setOrganisation}
          required
        />
        <Field
          label="Email address"
          type="email"
          placeholder="jane@institution.edu"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          label="Expected students / yr"
          type="number"
          placeholder="e.g. 200"
          value={expectedStudents}
          onChange={setExpectedStudents}
        />
      </div>
      <div className="mt-5">
        <label className="text-sm font-medium text-foreground">
          Message (optional)
        </label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your requirements, timeline, or any specific questions…"
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-base font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            Request demo &amp; bulk quote <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        Or email us directly at{" "}
        <a
          href="mailto:institutions@itestu.uz"
          className="font-semibold text-navy hover:underline"
        >
          institutions@itestu.uz
        </a>
      </p>
    </form>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-4 text-sm placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
      />
    </div>
  );
}
