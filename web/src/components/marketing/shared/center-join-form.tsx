"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { joinCenter } from "@/lib/api/marketing";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export function CenterJoinForm({
  slug,
  centerName,
  joinDeepLink,
  variant = "dark",
}: {
  slug: string;
  centerName: string;
  joinDeepLink: string | null;
  variant?: "dark" | "light";
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isLight = variant === "light";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await joinCenter(slug, { name: name.trim(), email: email.trim() });
      setDone(true);
    } catch (err) {
      setError(
        getErrorMessage(err, "Could not sign you up. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  const shell = cn(
    "w-full rounded-2xl border p-6 shadow-sm lg:max-w-md",
    isLight
      ? "border-border bg-white"
      : "border-white/10 bg-white/5 backdrop-blur lg:w-80",
  );

  if (done) {
    return (
      <div className={shell}>
        <CheckCircle2 className={cn("h-8 w-8", isLight ? "text-emerald-600" : "text-emerald-400")} />
        <p className={cn("mt-3 text-sm font-semibold", isLight ? "text-navy" : "text-white")}>
          Almost there — check your email
        </p>
        <p className={cn("mt-1 text-xs leading-relaxed", isLight ? "text-muted" : "text-slate-400")}>
          We&apos;ve emailed{" "}
          <span className={cn("font-semibold", isLight ? "text-navy" : "text-slate-200")}>
            {email}
          </span>{" "}
          a link to verify your account and set a password. After {centerName} approves you, you
          can start booking mocks.
        </p>
      </div>
    );
  }

  return (
    <div className={shell}>
      <p className={cn("text-base font-bold", isLight ? "text-navy" : "text-white")}>
        Join this centre
      </p>
      <p className={cn("mt-1.5 text-sm leading-relaxed", isLight ? "text-muted" : "text-slate-400")}>
        Sign up as a student of {centerName}. We&apos;ll email you a verification link.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div>
          <label
            htmlFor="center-join-name"
            className={cn("text-xs font-medium", isLight ? "text-foreground" : "text-slate-300")}
          >
            Full name
          </label>
          <input
            id="center-join-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className={cn(
              "mt-1 h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2",
              isLight
                ? "border-border bg-white text-foreground placeholder:text-slate-400 focus:border-navy focus:ring-navy/20"
                : "border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus:border-white/40 focus:ring-white/10",
            )}
          />
        </div>
        <div>
          <label
            htmlFor="center-join-email"
            className={cn("text-xs font-medium", isLight ? "text-foreground" : "text-slate-300")}
          >
            Email address
          </label>
          <input
            id="center-join-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className={cn(
              "mt-1 h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2",
              isLight
                ? "border-border bg-white text-foreground placeholder:text-slate-400 focus:border-navy focus:ring-navy/20"
                : "border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus:border-white/40 focus:ring-white/10",
            )}
          />
        </div>

        {error ? (
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              isLight
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200",
            )}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-sm font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing up…
            </>
          ) : (
            <>
              Sign up <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {joinDeepLink ? (
        <div
          className={cn(
            "mt-4 border-t pt-4 text-center",
            isLight ? "border-border" : "border-white/10",
          )}
        >
          <p className={cn("text-xs", isLight ? "text-muted" : "text-slate-400")}>
            Prefer Telegram?
          </p>
          <a
            href={joinDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors",
              isLight ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-200",
            )}
          >
            <Send className="h-3.5 w-3.5" /> Join via Telegram bot
          </a>
        </div>
      ) : null}
    </div>
  );
}
