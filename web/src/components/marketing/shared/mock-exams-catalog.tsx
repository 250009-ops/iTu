"use client";

import { PackageGrid } from "@/components/marketing/shared/package-grid";
import type { MockPackage } from "@/lib/marketing/data";

type Props = {
  packages: MockPackage[];
  highlightSlug?: string;
};

export function MockExamsCatalog({ packages, highlightSlug }: Props) {
  return <PackageGrid packages={packages} highlightSlug={highlightSlug} />;
}
