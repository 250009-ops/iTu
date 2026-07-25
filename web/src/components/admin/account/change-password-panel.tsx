"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";

export function ChangePasswordPanel() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) {
      toast("Fill in all password fields", { variant: "warning" });
      return;
    }
    if (next !== confirm) {
      toast("Passwords don't match", { variant: "warning" });
      return;
    }
    if (next.length < 6) {
      toast("Password too short", {
        description: "Use at least 6 characters.",
        variant: "warning",
      });
      return;
    }
    if (next === current) {
      toast("Choose a different password", {
        description: "New password must differ from your current one.",
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast("Password updated", {
        description: "Your password was changed successfully.",
        variant: "success",
      });
    } catch (err) {
      toast("Could not update password", {
        description: getErrorMessage(err, "Check your current password."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Change password</h2>
        <p className="mt-0.5 text-sm text-muted">
          Update the password for your admin account. Use a strong password you
          don&apos;t reuse elsewhere.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Current password
          </label>
          <div className="mt-1.5">
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              New password
            </label>
            <div className="mt-1.5">
              <Input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Confirm new password
            </label>
            <div className="mt-1.5">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
          </div>
        </div>

        <Button type="submit" size="sm" loading={submitting}>
          <KeyRound className="h-4 w-4" />
          Update password
        </Button>
      </form>
    </div>
  );
}
