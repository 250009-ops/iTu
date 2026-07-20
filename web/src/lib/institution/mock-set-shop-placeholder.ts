import type { InstitutionMockShopOffer } from "@/lib/api/institution";

/** Shown when the shop API returns no offers (legacy API or empty catalog). */
export const INSTITUTION_MOCK_SHOP_PLACEHOLDER: InstitutionMockShopOffer = {
  setId: null,
  slug: "institution-mock-set",
  title: "Institution Mock Set",
  description:
    "B2B bundle of platform section mocks — enroll unlimited students after purchase.",
  listPrice: 0,
  currency: "UZS",
  contentSummary: "Listening · Reading · Writing",
  canPurchase: false,
  disabledReason:
    "Mock sets are not available for purchase yet. Contact iTestU admin.",
  product: {
    id: "placeholder",
    slug: "institution-mock-set",
    title: "Institution Mock Set",
    description:
      "B2B mock set with 3 section mocks for your centre.",
    examType: "Academic",
    delivery: "Computer-Based",
    bookCta: "Buy mock set",
    price: 0,
    currency: "UZS",
    mostPopular: false,
    rating: null,
    reviewCount: 0,
    skills: [
      {
        id: "listening",
        name: "Listening",
        detail: "40 questions · 40 min",
        badge: "Auto scored",
        color: "sky",
      },
      {
        id: "reading",
        name: "Reading",
        detail: "40 questions · 60 min",
        badge: "Auto scored",
        color: "emerald",
      },
      {
        id: "writing",
        name: "Writing",
        detail: "2 tasks · 60 min",
        badge: "Human graded",
        color: "violet",
      },
    ],
    included: [
      "Enroll unlimited students on included section mocks",
      "No per-enrollment credit charges",
      "Official computer-delivered IELTS format",
    ],
    rules: [
      "Set content locked after purchase",
      "One purchase per centre",
    ],
    highlights: [
      { icon: "check", label: "3 section mocks included" },
      { icon: "user", label: "Unlimited student enrollments" },
      { icon: "globe", label: "Official CBT format" },
    ],
  },
};
