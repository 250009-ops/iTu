"use client";

import { ExternalLink } from "lucide-react";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";

const services = [
  {
    name: "Lemon Squeezy",
    description: "Student checkout — cards, PayPal, Apple Pay (international cards supported)",
    key: "lemonSqueezyConfigured" as const,
  },
  {
    name: "Eskiz SMTP",
    description: "Transactional email — password reset, bookings, results",
    key: "smtpConfigured" as const,
  },
  {
    name: "LiveKit",
    description: "Speaking exam live video & server-side recording",
    key: "livekitConfigured" as const,
  },
  {
    name: "VPS Media Storage",
    description: "Listening audio & speaking recordings on Eskiz server disk",
    key: "mediaStorageConfigured" as const,
  },
];

const serviceStatusStyles = {
  connected: { dot: "bg-emerald-500", label: "Connected", text: "text-emerald-600" },
  disconnected: { dot: "bg-slate-300", label: "Not connected", text: "text-muted" },
};

export function IntegrationsPanel() {
  const { integrations } = useAdminSettings();
  const flags = integrations as Record<string, boolean>;

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Integrations</h2>
        <p className="mt-0.5 text-sm text-muted">
          Status of connected third-party services. Configuration is managed on
          the server — contact your technical team to change connections.
        </p>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Connected Services
        </p>
        <div className="mt-3 space-y-2">
          {services.map((service) => {
            const connected = flags[service.key] ?? false;
            const status = connected
              ? serviceStatusStyles.connected
              : serviceStatusStyles.disconnected;
            return (
              <div
                key={service.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-navy">{service.name}</p>
                  <p className="text-sm text-muted">{service.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-semibold",
                      status.text,
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                    {status.label}
                  </span>
                  <span className="text-xs text-muted">via api/.env</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border bg-slate-50 px-4 py-3 text-sm text-muted">
        <p>
          <strong className="text-navy">Eskiz mail:</strong> create a mailbox
          (e.g. <code className="text-xs">noreply@itestu.uz</code>) in the
          Eskiz panel, then set <code className="text-xs">SMTP_*</code> in{" "}
          <code className="text-xs">api/.env</code> on the VPS. Use{" "}
          <code className="text-xs">npm run mail:test</code> in the api folder
          to verify.
        </p>
        <a
          href="https://eskiz.uz/uz/mail"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
        >
          Eskiz mail docs
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
