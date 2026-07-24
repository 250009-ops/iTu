import type {
  MockSetContentOptionPackage,
  MockSetContentOptionTest,
} from "@/lib/api/admin-institution-mock-sets";

export type MockSetPickerTab = "listening" | "reading" | "writing";

export function isPackageSelectable(
  pkg: MockSetContentOptionPackage,
  selectedPackageIds: Set<string>,
  currentSetId?: string,
): boolean {
  if (selectedPackageIds.has(pkg.id)) return true;
  if (!pkg.isAssigned) return true;
  return pkg.assignedSetId === currentSetId;
}

export function isTestSelectable(
  test: MockSetContentOptionTest,
  selectedTestIds: Set<string>,
  currentSetId?: string,
): boolean {
  if (selectedTestIds.has(test.id)) return true;
  if (!test.isAssigned) return true;
  return test.assignedSetId === currentSetId;
}

export function formatMockSetSelectionSummary(
  listening: number,
  reading: number,
  writing: number,
): string {
  return `${listening} Listening · ${reading} Reading · ${writing} Writing`;
}

/** Retail section-mock catalog prices (UZS) — used to suggest B2B list price. */
const SECTION_LIST_PRICE_UZS: Record<MockSetPickerTab, number> = {
  listening: 16_000,
  reading: 16_000,
  writing: 16_000,
};

export function slugifyInstitutionMockSetTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Auto-fill defaults for a new set based on selected section counts. */
export function buildInstitutionMockSetDefaults(counts: {
  listening: number;
  reading: number;
  writing: number;
}): {
  title: string;
  slug: string;
  description: string;
  listPrice: number;
} {
  const total = counts.listening + counts.reading + counts.writing;
  if (total === 0) {
    return { title: "", slug: "", description: "", listPrice: 0 };
  }

  const title = formatMockSetSelectionSummary(
    counts.listening,
    counts.reading,
    counts.writing,
  );
  const listPrice =
    counts.listening * SECTION_LIST_PRICE_UZS.listening +
    counts.reading * SECTION_LIST_PRICE_UZS.reading +
    counts.writing * SECTION_LIST_PRICE_UZS.writing;

  return {
    title,
    slug: slugifyInstitutionMockSetTitle(title),
    description: `B2B mock set with ${total} section mock${total === 1 ? "" : "s"} for centres.`,
    listPrice,
  };
}

const SECTION_SHOP_META: Record<
  MockSetPickerTab,
  {
    name: string;
    badge: string;
    includedBadge: string;
    color: "sky" | "emerald" | "violet";
  }
> = {
  listening: {
    name: "Listening",
    badge: "Not included",
    includedBadge: "Auto scored",
    color: "sky",
  },
  reading: {
    name: "Reading",
    badge: "Not included",
    includedBadge: "Auto scored",
    color: "emerald",
  },
  writing: {
    name: "Writing",
    badge: "Not included",
    includedBadge: "Human graded",
    color: "violet",
  },
};

export function buildInstitutionMockSetProductPreview(input: {
  title: string;
  description: string;
  listPrice: number;
  sectionCounts: Record<MockSetPickerTab, number>;
  sectionDetails: Partial<Record<MockSetPickerTab, string>>;
}) {
  const sectionOrder: MockSetPickerTab[] = ["listening", "reading", "writing"];
  const includedCount = sectionOrder.filter(
    (kind) => input.sectionCounts[kind] > 0,
  ).length;

  const skills = sectionOrder.map((kind) => {
    const count = input.sectionCounts[kind];
    const meta = SECTION_SHOP_META[kind];
    const detail =
      count === 0
        ? "0 mocks"
        : input.sectionDetails[kind]?.trim() ||
          `${count} mock${count === 1 ? "" : "s"}`;

    return {
      id: kind,
      name: meta.name,
      detail,
      badge: count === 0 ? meta.badge : meta.includedBadge,
      color: meta.color,
    };
  });

  const trimmedTitle = input.title.trim() || "Untitled mock set";
  const trimmedDescription = input.description.trim();

  return {
    id: "preview",
    slug: "preview",
    title: trimmedTitle,
    description:
      trimmedDescription ||
      (includedCount > 0
        ? `B2B mock set with ${includedCount} section mock${includedCount === 1 ? "" : "s"} for your centre.`
        : "Select listening, reading, and writing mocks to build this set."),
    examType: "Academic" as const,
    delivery: "Computer-Based",
    bookCta: "Buy mock set",
    price: input.listPrice,
    currency: "UZS",
    mostPopular: false,
    rating: null,
    reviewCount: 0,
    skills,
    included: [] as string[],
    rules: [] as string[],
    highlights: [
      {
        icon: "check" as const,
        label: `${includedCount} section mock${includedCount === 1 ? "" : "s"} included`,
      },
      { icon: "user" as const, label: "Unlimited student enrollments" },
      { icon: "globe" as const, label: "Computer-delivered mock format" },
    ],
  };
}
