"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { joinCenter } from "@/lib/api/marketing";
import { getErrorMessage } from "@/lib/api/errors";

// Web-native "Join this centre" card for the public centre page. Works even
// where Telegram is blocked; the Telegram deep link is offered as a secondary
// option underneath.
export function CenterJoinForm({
  slug,
  centerName,
  joinDeepLink,
}: {
  slug: string;
  centerName: string;
  joinDeepLink: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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

  if (done) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur lg:w-80">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        <p className="mt-3 text-sm font-semibold text-white">
          Almost there — check your email
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          We&apos;ve emailed{" "}
          <span className="font-semibold text-slate-200">{email}</span> a link to
          verify your account and set a password. After {centerName} approves
          you, you can start booking mocks.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur lg:w-80">
      <p className="text-sm font-semibold text-white">Join this centre</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Sign up as a student of {centerName}. We&apos;ll email you a link to
        verify and set your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
        />

        {error ? (
          <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
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
        <div className="mt-4 border-t border-white/10 pt-3 text-center">
          <p className="text-xs text-slate-400">Prefer Telegram?</p>
          <a
            href={joinDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 transition-colors hover:text-sky-200"
          >
            <Send className="h-3.5 w-3.5" /> Join via Telegram bot
          </a>
        </div>
      ) : null}
    </div>
  );
}
