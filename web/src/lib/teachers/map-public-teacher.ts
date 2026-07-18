import { SPECIALITY_ACCENT } from "@/components/marketing/ui/accents";
import type { AccentColor } from "@/lib/marketing/data";

export type TeacherSpeciality = "Writing" | "Speaking" | "Writing & Speaking";

export type ApiPublicTeacher = {
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
  avatarUrl: string | null;
  memberSince: number;
  reviews?: { id: string; name: string; rating: number; quote: string }[];
};

export type PublicExaminer = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  speciality: TeacherSpeciality;
  accent: AccentColor;
  rating: number;
  reviewCount: number;
  totalSessions: number;
  isTopRated: boolean;
  bio: string;
  longBio: string;
  credentials: string[];
  languages: string[];
  avatarUrl: string | null;
  memberSince: number;
  reviews: { id: string; name: string; rating: number; quote: string }[];
  sampleFeedback: { label: string; quote: string };
};

function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.?|Prof\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function mapPublicExaminer(t: ApiPublicTeacher): PublicExaminer {
  const speciality = t.speciality as TeacherSpeciality;
  const accent = SPECIALITY_ACCENT[t.speciality] ?? "sky";
  const reviews = t.reviews ?? [];

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
    isTopRated: t.isTopRated,
    bio: t.bio,
    longBio: t.longBio,
    credentials: t.credentials ?? [],
    languages: t.languages?.length ? t.languages : ["English"],
    avatarUrl: t.avatarUrl,
    memberSince: t.memberSince,
    reviews,
    sampleFeedback: reviews.length
      ? { label: `${speciality} feedback`, quote: reviews[0].quote }
      : {
          label: `${speciality} feedback`,
          quote:
            "Criteria-level written feedback pinpoints exactly where to gain marks across each band descriptor.",
        },
  };
}

export function positiveReviewPercent(rating: number): number {
  if (rating <= 0) return 0;
  return Math.round((rating / 5) * 100);
}
