"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";

const services = [
  {
    name: "Stripe",
    description: "Payment processing & subscriptions",
    key: "stripeConfigured" as const,
    envManaged: false,
  },
  {
    name: "SendGrid",
    description: "Transactional email delivery",
    key: "sendgridConfigured" as const,
    envManaged: false,
  },
  {
    name: "LiveKit",
    description: "Speaking exam live video & server-side recording",
    key: "livekitConfigured" as const,
    envManaged: true,
  },
  {
    name: "Slack",
    description: "Admin alert notifications",
    key: "slackConfigured" as const,
    envManaged: false,
  },
  {
    name: "AWS S3",
    description: "Speaking recording storage (optional — LiveKit Cloud storage used when unset)",
    key: "s3Configured" as const,
    envManaged: true,
  },
];

const serviceStatusStyles = {
  connected: { dot: "bg-emerald-500", label: "Connected", text: "text-emerald-600" },
  disconnected: { dot: "bg-slate-300", label: "Not connected", text: "text-muted" },
};

export function IntegrationsPanel() {
  const { integrations, setField } = useAdminSettings();
  const flags = integrations as Record<string, boolean>;

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Integrations</h2>
        <p className="mt-0.5 text-sm text-muted">
          Toggle which third-party services are enabled. Save changes from the
          footer when done.
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
                      "flex items-center gap-1.5 text-xs font-semibold",
                      status.text,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </span>
                  {service.envManaged ? (
                    <span className="text-xs text-muted">
                      Set in <code className="rounded bg-slate-100 px-1">api/.env</code>
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        setField("integrations", service.key, !connected)
                      }
                    >
                      {connected ? "Disconnect" : "Connect"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        LiveKit and S3 connection status is read from server environment variables.
        Stripe, SendGrid, and Slack toggles are persisted in platform settings.
      </div>
    </div>
  );
}
