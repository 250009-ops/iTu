import {
  buildInstitutionMockSetDefaults,
  buildInstitutionMockSetProductPreview,
} from "@/lib/admin/institution-mock-set-content";
import type {
  InstitutionMockPreview,
  InstitutionMockShopOffer,
} from "@/lib/api/institution";

const PLACEHOLDER_SECTION_COUNTS = {
  listening: 1,
  reading: 1,
  writing: 1,
  speaking: 0,
} as const;

const PLACEHOLDER_SET_TITLE = "Academic Section Mock Set";

function placeholderSetMeta() {
  const defaults = buildInstitutionMockSetDefaults(PLACEHOLDER_SECTION_COUNTS);
  return {
    title: defaults.title || PLACEHOLDER_SET_TITLE,
    description:
      defaults.description ||
      "B2B mock set with listening, reading, and writing section mocks for your centre.",
    listPrice: defaults.listPrice,
  };
}

function placeholderShopProduct() {
  const meta = placeholderSetMeta();
  return buildInstitutionMockSetProductPreview({
    title: meta.title,
    description: meta.description,
    listPrice: meta.listPrice,
    sectionCounts: PLACEHOLDER_SECTION_COUNTS,
    sectionDetails: {
      listening: "1 mock",
      reading: "1 mock",
      writing: "1 mock",
    },
  });
}

/** Static preview when the centre has no grants and the API returns no showcase set. */
export function buildInstitutionMocksPreviewPlaceholder(): InstitutionMockPreview {
  const meta = placeholderSetMeta();
  const setTitle = meta.title;

  const sectionPackages = (
    [
      { kind: "listening", label: "Listening Mock 1", mockNumber: 1 },
      { kind: "reading", label: "Reading Mock 1", mockNumber: 1 },
      { kind: "writing", label: "Writing Mock 1", mockNumber: 1 },
    ] as const
  ).map((section) => ({
    id: `placeholder-${section.kind}`,
    slug: `placeholder-${section.kind}`,
    title: section.label,
    description: `${section.label} from ${setTitle}.`,
    price: 0,
    currency: "UZS",
    examType: "ACADEMIC",
    packageKind: section.kind,
    mockNumber: section.mockNumber,
    mostPopular: false,
    rating: null,
    reviewCount: 0,
    skills: [section.kind],
    included: ["Computer-delivered section mock", "Unlimited student enrollments"],
    rules: ["Official IELTS computer-delivered format"],
    grantSetId: "placeholder-set",
    grantSetTitle: setTitle,
    grantSource: "ADMIN_GRANT" as const,
  }));

  return {
    showcaseSetTitle: setTitle,
    tabs: [
      {
        tabId: "listening",
        label: "Listening",
        packageKind: "listening",
        examType: "ACADEMIC",
      },
      {
        tabId: "reading",
        label: "Reading",
        packageKind: "reading",
        examType: "ACADEMIC",
      },
      {
        tabId: "writing",
        label: "Writing",
        packageKind: "writing",
        examType: "ACADEMIC",
      },
    ],
    packages: sectionPackages,
  };
}

export const INSTITUTION_MOCK_SHOP_UNAVAILABLE_REASON =
  "Test sets are not available for purchase yet. Contact iTestU admin.";

export const INSTITUTION_MOCK_ENROLL_LOCKED_REASON =
  "Create and activate a mock on the Mocks page to enroll students";

/** Static shop card when no listed sets are returned from the API. */
export function buildInstitutionMockShopPlaceholder(): InstitutionMockShopOffer {
  const meta = placeholderSetMeta();
  const product = placeholderShopProduct();

  return {
    setId: null,
    slug: "placeholder",
    title: meta.title,
    description: meta.description,
    listPrice: meta.listPrice,
    currency: "UZS",
    contentSummary: "1 Listening · 1 Reading · 1 Writing",
    canPurchase: false,
    disabledReason: INSTITUTION_MOCK_SHOP_UNAVAILABLE_REASON,
    product: {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      examType: product.examType,
      delivery: product.delivery,
      bookCta: product.bookCta,
      price: product.price,
      currency: product.currency,
      mostPopular: product.mostPopular,
      rating: product.rating,
      reviewCount: product.reviewCount,
      skills: product.skills,
      included: product.included,
      rules: product.rules,
      highlights: product.highlights,
    },
  };
}
