import { API_BASE_URL } from "@/lib/api/config";
import { SPECIALITY_ACCENT } from "@/components/marketing/ui/accents";
import {
  PACKAGES,
  type AccentColor,
  type TopStudent,
  type TopTeacher,
  type TeacherSpeciality,
  type MockPackage,
  type Testimonial,
  type SkillId,
} from "./data";
import { formatSocialCount, SOCIAL_PROOF_MIN } from "./social-proof";

const ACCENT_CYCLE: AccentColor[] = ["sky", "emerald", "violet", "rose"];

function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.?|Prof\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Server-side fetch against the API. Returns null on any failure so callers can fall back. */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

type ApiStats = {
  mocksDelivered: number;
  candidates: number;
  certifiedExaminers: number;
  examinerRating: number | null;
  avgBandImprovement: number | null;
};

export type HeroStats = {
  candidates: string | null;
  mocks: string | null;
  rating: string | null;
  examiners: string | null;
  candidatesRaw: number;
  examinersRaw: number;
  mocksRaw: number;
  ratingRaw: number | null;
};

const EMPTY_HERO_STATS: HeroStats = {
  candidates: null,
  mocks: null,
  rating: null,
  examiners: null,
  candidatesRaw: 0,
  examinersRaw: 0,
  mocksRaw: 0,
  ratingRaw: null,
};

export type MarketingStat = {
  id: string;
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

/** Formatted platform-stat strings for hero/CTA copy. Counts hidden below SOCIAL_PROOF_MIN. */
export async function fetchHeroStats(): Promise<HeroStats> {
  const s = await get<ApiStats>("/marketing/stats");
  if (!s) return EMPTY_HERO_STATS;
  return {
    candidates: formatSocialCount(s.candidates),
    mocks: formatSocialCount(s.mocksDelivered),
    rating: s.examinerRating != null ? s.examinerRating.toFixed(1) : null,
    examiners: formatSocialCount(s.certifiedExaminers),
    candidatesRaw: s.candidates,
    examinersRaw: s.certifiedExaminers,
    mocksRaw: s.mocksDelivered,
    ratingRaw: s.examinerRating,
  };
}

export async function fetchStats(): Promise<MarketingStat[]> {
  const s = await get<ApiStats>("/marketing/stats");
  if (!s) return [];

  const stats: MarketingStat[] = [];

  if (s.mocksDelivered >= SOCIAL_PROOF_MIN) {
    stats.push({
      id: "mocks",
      value: s.mocksDelivered,
      suffix: "+",
      label: "Mocks delivered",
    });
  }
  if (s.avgBandImprovement != null) {
    stats.push({
      id: "improvement",
      prefix: "+",
      value: s.avgBandImprovement,
      decimals: 1,
      label: "Avg. band improvement",
    });
  }
  if (s.examinerRating != null) {
    stats.push({
      id: "rating",
      value: s.examinerRating,
      decimals: 1,
      suffix: "★",
      label: "Examiner rating",
    });
  }
  if (s.certifiedExaminers >= SOCIAL_PROOF_MIN) {
    stats.push({
      id: "examiners",
      value: s.certifiedExaminers,
      suffix: "+",
      label: "Certified examiners",
    });
  }

  return stats;
}

// ─── Teachers ──────────────────────────────────────────────────────────────────

type ApiTeacher = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  speciality: string;
  rating: number;
  reviewCount: number;
  totalSessions: number;
  isTopRated: boolean;
  bio: string;
  longBio: string;
  credentials: string[];
  languages: string[];
  reviews?: { id: string; name: string; rating: number; quote: string }[];
};

function mapTeacher(t: ApiTeacher): TopTeacher {
  const speciality = t.speciality as TeacherSpeciality;
  const accent = SPECIALITY_ACCENT[t.speciality] ?? "sky";
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    initials: t.initials || initialsOf(t.name),
    speciality,
    accent,
    rating: t.rating || 0,
    reviewCount: t.reviewCount,
    totalSessions: t.totalSessions,
    bio: t.bio,
    longBio: t.longBio,
    credentials: t.credentials ?? [],
    languages: t.languages?.length ? t.languages : ["English"],
    isTopRated: t.isTopRated,
    sampleFeedback: t.reviews?.length
      ? { label: `${speciality} feedback`, quote: t.reviews[0].quote }
      : {
          label: `${speciality} feedback`,
          quote:
            "Criteria-level written feedback pinpoints exactly where to gain marks across each band descriptor.",
        },
    reviews: t.reviews ?? [],
    photoSeed: t.slug,
  };
}

export async function fetchTeachers(): Promise<TopTeacher[]> {
  const data = await get<ApiTeacher[]>("/marketing/teachers");
  if (!data || data.length === 0) return [];
  return data.map(mapTeacher);
}

export async function fetchTeacher(slug: string): Promise<TopTeacher | null> {
  const data = await get<ApiTeacher | null>(`/marketing/teachers/${slug}`);
  if (data) return mapTeacher(data);
  return null;
}

// ─── Packages ───────────────────────────────────────────────────────────────────

type ApiPackage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  examType: "ACADEMIC" | "GENERAL_TRAINING";
  mostPopular: boolean;
  rating: number | null;
  reviewCount: number;
  skills: string[];
  included: string[];
  rules: string[];
};

export async function fetchPackages(): Promise<MockPackage[]> {
  const data = await get<ApiPackage[]>("/catalog/packages");
  if (data === null) return PACKAGES;
  if (data.length === 0) return [];
  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    examType: p.examType,
    delivery:
      p.skills.length === 1 && p.skills[0] === "speaking"
        ? "Live video"
        : "Computer-delivered",
    description: p.description ?? "",
    price: p.price,
    currency: p.currency,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount,
    mostPopular: p.mostPopular,
    skills: p.skills as SkillId[],
    included: p.included,
    rules: p.rules,
  }));
}

// ─── Leaderboard ───────────────────────────────────────────────────────────────

type ApiLeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  country: string;
  overallBand: number;
  skillBands: { listening: number; reading: number; writing: number; speaking: number };
  improvementDelta: number;
};

export async function fetchLeaderboard(): Promise<TopStudent[]> {
  const data = await get<ApiLeaderboardEntry[]>("/marketing/leaderboard");
  if (!data || data.length < 3) return [];
  return data.map((s, i) => ({
    id: s.id,
    rank: s.rank,
    name: s.name,
    initials: initialsOf(s.name),
    country: s.country,
    overallBand: s.overallBand,
    skillBands: s.skillBands,
    improvementDelta: s.improvementDelta,
    accent: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
  }));
}

// ─── Testimonials ──────────────────────────────────────────────────────────────

type ApiTestimonial = {
  id: string;
  quote: string;
  name: string;
  country: string;
  rating: number;
  band: number | null;
};

// ─── Partner centres ─────────────────────────────────────────────────────────

export type PartnerCenter = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  logoUrl: string | null;
  bio: string | null;
  studentCount: number;
  joinDeepLink: string | null;
};

export type PartnerCenterDetail = PartnerCenter & {
  address: string | null;
  partnerSince: string;
  mocksDelivered: number;
  examinerCount: number;
};

export async function fetchCenters(): Promise<PartnerCenter[]> {
  const data = await get<PartnerCenter[]>("/marketing/centers");
  return data ?? [];
}

export async function fetchPartnerOnboarding(): Promise<{
  telegramApplyLink: string | null;
}> {
  const data = await get<{ telegramApplyLink: string | null }>(
    "/marketing/partner-onboarding",
  );
  return data ?? { telegramApplyLink: null };
}

export async function fetchCenter(
  slug: string,
): Promise<PartnerCenterDetail | null> {
  return get<PartnerCenterDetail | null>(
    `/marketing/centers/${encodeURIComponent(slug)}`,
  );
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const data = await get<ApiTestimonial[]>("/marketing/testimonials");
  if (!data || data.length === 0) return [];
  return data.map((t) => ({
    id: t.id,
    quote: t.quote,
    name: t.name,
    initials: initialsOf(t.name),
    country: t.country,
    band: t.band ?? 0,
  }));
}
