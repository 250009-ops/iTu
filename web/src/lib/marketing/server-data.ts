import { API_BASE_URL } from "@/lib/api/config";
import { SPECIALITY_ACCENT } from "@/components/marketing/ui/accents";
import {
  STATS,
  TOP_STUDENTS,
  TOP_TEACHERS,
  PACKAGES,
  MARKETING_TESTIMONIALS,
  type AccentColor,
  type TopStudent,
  type TopTeacher,
  type TeacherSpeciality,
  type MockPackage,
  type Testimonial,
  type SkillId,
} from "./data";

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
  candidates: string;
  mocks: string;
  rating: string;
  examiners: string;
  candidatesRaw: number;
  examinersRaw: number;
};

const HERO_STATS_FALLBACK: HeroStats = {
  candidates: "9,500+",
  mocks: "9,500+",
  rating: "4.9",
  examiners: "320+",
  candidatesRaw: 9500,
  examinersRaw: 320,
};

function withPlus(n: number): string {
  return `${n.toLocaleString()}+`;
}

/** Formatted platform-stat strings for hero/CTA copy, with static fallback. */
export async function fetchHeroStats(): Promise<HeroStats> {
  const s = await get<ApiStats>("/marketing/stats");
  if (!s) return HERO_STATS_FALLBACK;
  return {
    candidates: withPlus(s.candidates),
    mocks: withPlus(s.mocksDelivered),
    rating: (s.examinerRating ?? 4.9).toFixed(1),
    examiners: withPlus(s.certifiedExaminers),
    candidatesRaw: s.candidates,
    examinersRaw: s.certifiedExaminers,
  };
}

export async function fetchStats(): Promise<typeof STATS> {
  const s = await get<ApiStats>("/marketing/stats");
  if (!s) return STATS;
  return [
    { id: "mocks", value: s.mocksDelivered, suffix: "+", label: "Mocks delivered" },
    {
      id: "improvement",
      prefix: "+",
      value: s.avgBandImprovement ?? 1.5,
      decimals: 1,
      label: "Avg. band improvement",
    },
    {
      id: "rating",
      value: s.examinerRating ?? 4.9,
      decimals: 1,
      suffix: "★",
      label: "Examiner rating",
    },
    { id: "examiners", value: s.certifiedExaminers, suffix: "+", label: "Certified examiners" },
  ] as unknown as typeof STATS;
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
    photoSeed: t.slug,
  };
}

export async function fetchTeachers(): Promise<TopTeacher[]> {
  const data = await get<ApiTeacher[]>("/marketing/teachers");
  if (!data || data.length === 0) return TOP_TEACHERS;
  return data.map(mapTeacher);
}

export async function fetchTeacher(slug: string): Promise<TopTeacher | null> {
  const data = await get<ApiTeacher | null>(`/marketing/teachers/${slug}`);
  if (data) return mapTeacher(data);
  return TOP_TEACHERS.find((t) => t.slug === slug) ?? null;
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
  // Only use static demo data when the API is unreachable — not when the catalog is empty.
  if (data === null) return PACKAGES;
  if (data.length === 0) return [];
  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    examType: p.examType,
    delivery: p.skills.length === 1 && p.skills[0] === "speaking" ? "Live video" : "Computer-delivered",
    description: p.description ?? "",
    price: p.price,
    currency: p.currency,
    rating: p.rating ?? 4.8,
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
  if (!data || data.length < 3) return TOP_STUDENTS;
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

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const data = await get<ApiTestimonial[]>("/marketing/testimonials");
  if (!data || data.length === 0) return MARKETING_TESTIMONIALS;
  return data.map((t) => ({
    id: t.id,
    quote: t.quote,
    name: t.name,
    initials: initialsOf(t.name),
    country: t.country,
    band: t.band ?? 7.5,
  }));
}
