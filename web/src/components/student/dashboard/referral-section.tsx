"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Gift,
  Loader2,
  Mail,
  Share2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  claimReferralReward,
  getStudentReferralStatus,
  sendReferralInvite,
  type StudentReferralStatus,
} from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import { SITE } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ReferralSection() {
  const router = useRouter();
  const [status, setStatus] = useState<StudentReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [friendName, setFriendName] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [claimSkill, setClaimSkill] = useState<"listening" | "reading" | null>(
    null,
  );
  const [mockDate, setMockDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getStudentReferralStatus());
    } catch (err) {
      setError(getErrorMessage(err, "Could not load referral status"));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shareUrl =
    status != null
      ? `${SITE.domain.replace(/\/$/, "")}${status.sharePath}`
      : "";

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleSendInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("Enter your friend’s email address");
      return;
    }
    setSendingInvite(true);
    setInviteError(null);
    setInviteMessage(null);
    try {
      const result = await sendReferralInvite({
        email,
        ...(friendName.trim() ? { friendName: friendName.trim() } : {}),
      });
      setStatus(result.status);
      setInviteMessage(`Invite email sent to ${result.email}`);
      setInviteEmail("");
      setFriendName("");
    } catch (err) {
      setInviteError(getErrorMessage(err, "Could not send invite email"));
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleClaim() {
    if (!claimSkill) return;
    setSubmitting(true);
    setClaimError(null);
    try {
      await claimReferralReward({ skill: claimSkill, mockDate });
      setClaimSkill(null);
      router.push(`/student/mock-day?referral=${claimSkill}`);
      void load();
    } catch (err) {
      setClaimError(getErrorMessage(err, "Could not claim referral reward"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-white py-10">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (error || !status) {
    return null;
  }

  const progress = Math.min(status.inviteCount, status.requiredInvites);
  const skillLabel =
    status.rewardSkill === "listening"
      ? "Listening"
      : status.rewardSkill === "reading"
        ? "Reading"
        : null;

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
                <Users className="h-3.5 w-3.5" />
                Invite friends
              </div>
              <h2 className="mt-3 text-lg font-bold text-navy sm:text-xl">
                Invite 2 students → free Reading or Listening
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted">
                Send an email invite. When your friend opens the link and creates
                a student account, it counts toward your reward.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  {Array.from({ length: status.requiredInvites }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                        i < progress
                          ? "bg-navy text-white"
                          : "bg-white text-muted ring-1 ring-border",
                      )}
                    >
                      {i < progress ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-medium text-navy">
                  {status.inviteCount}/{status.requiredInvites} joined
                </p>
              </div>
            </div>

            <div className="w-full shrink-0 space-y-3 rounded-xl border border-sky-100 bg-white/80 p-4 sm:max-w-md">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Send invite by email
              </p>
              <Input
                type="text"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Friend’s name (optional)"
                disabled={sendingInvite}
              />
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@email.com"
                disabled={sendingInvite}
              />
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => void handleSendInvite()}
                disabled={sendingInvite}
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send invite email
                  </>
                )}
              </Button>
              {inviteMessage ? (
                <p className="text-sm font-medium text-emerald-700">
                  {inviteMessage}
                </p>
              ) : null}
              {inviteError ? (
                <p className="text-sm text-red-700">{inviteError}</p>
              ) : null}

              <div className="border-t border-border pt-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Or copy your link
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="bg-slate-50 text-xs sm:text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void copyLink()}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-sky-100 px-5 py-4 sm:px-6">
          {status.rewardClaimed ? (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
              <Gift className="h-4 w-4" />
              Reward claimed
              {skillLabel ? ` — free ${skillLabel} mock` : ""}
            </p>
          ) : status.rewardUnlocked ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-navy">
                Reward unlocked — choose Listening or Reading.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setClaimSkill("listening")}
                >
                  Claim Listening
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setClaimSkill("reading")}
                >
                  Claim Reading
                </Button>
              </div>
            </div>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <Share2 className="h-4 w-4" />
              {status.requiredInvites - status.inviteCount} more friend
              {status.requiredInvites - status.inviteCount === 1 ? "" : "s"} must
              sign up via your link to unlock the free mock.
            </p>
          )}

          {status.pendingEmailInvites.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {status.pendingEmailInvites.slice(0, 4).map((invite) => (
                <li key={`${invite.email}-${invite.sentAt}`}>
                  Invite sent to {invite.email} — waiting for signup
                </li>
              ))}
            </ul>
          ) : null}

          {status.recentInvitees.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-emerald-800">
              {status.recentInvitees.slice(0, 3).map((invitee) => (
                <li key={`${invitee.name}-${invitee.joinedAt}`}>
                  {invitee.name} joined
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {claimSkill ? (
        <Modal
          open
          onClose={() => !submitting && setClaimSkill(null)}
          ariaLabel="Claim referral reward"
          className="max-w-md"
        >
          <div className="border-b border-border px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
              Referral reward
            </p>
            <h2 className="mt-1 text-lg font-semibold text-navy">
              Claim free{" "}
              {claimSkill === "listening" ? "Listening" : "Reading"} mock
            </h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-muted">
              Pick your mock day. Start anytime before the day cutoff — no
              payment required.
            </p>
            <Input
              type="date"
              min={todayIso()}
              value={mockDate}
              onChange={(e) => setMockDate(e.target.value)}
              disabled={submitting}
            />
            {claimError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {claimError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setClaimSkill(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleClaim()}
              disabled={submitting || !mockDate}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Claiming…
                </>
              ) : (
                "Claim free mock"
              )}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
