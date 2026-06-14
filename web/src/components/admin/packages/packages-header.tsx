"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminPackages } from "@/contexts/admin-packages-context";

export function PackagesHeader() {
  const { openEditor } = useAdminPackages();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Packages &amp; Pricing</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Packages &amp; Pricing
        </h1>
        <p className="mt-1 text-sm text-muted">
          Create mock exam products, set their prices, and link exam content.
          Changes publish live to the marketing site instantly.
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={() => openEditor(null)}>
        <Plus className="h-4 w-4" />
        New Package
      </Button>
    </div>
  );
}
