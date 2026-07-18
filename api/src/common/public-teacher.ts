export type PublicTeacherProfile = {
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
};

export function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.?|Prof\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function toPublicTeacher(t: {
  id: string;
  slug: string | null;
  user: { name: string };
  bio: string | null;
  longBio: string | null;
  avatarUrl?: string | null;
  credentials: unknown;
  languages: unknown;
  speciality: string;
  rating: number | null;
  reviewCount: number;
  isTopRated: boolean;
  totalSessions: number;
  createdAt: Date;
  applicationData?: unknown;
}): PublicTeacherProfile {
  const specialityLabel =
    t.speciality === 'BOTH'
      ? 'Writing & Speaking'
      : t.speciality === 'WRITING'
        ? 'Writing'
        : 'Speaking';

  const app = (t.applicationData ?? null) as {
    yearsExperience?: number;
    ieltsWritingBand?: number;
    ieltsSpeakingBand?: number;
    certificateUrls?: string[];
  } | null;

  const bio =
    t.bio?.trim() ||
    (app?.yearsExperience
      ? `Certified IELTS Writing & Speaking examiner with ${app.yearsExperience} years of experience. Band ${app.ieltsWritingBand ?? '—'} Writing · Band ${app.ieltsSpeakingBand ?? '—'} Speaking.`
      : '');

  const storedCredentials = Array.isArray(t.credentials)
    ? (t.credentials as string[])
    : [];
  const credentials =
    storedCredentials.length > 0
      ? storedCredentials
      : app?.certificateUrls?.length
        ? ['Verified qualifications']
        : [];

  return {
    id: t.id,
    slug: t.slug ?? t.id,
    name: t.user.name,
    initials: initialsOf(t.user.name),
    speciality: specialityLabel,
    rating: t.rating ?? 0,
    reviewCount: t.reviewCount,
    totalSessions: t.totalSessions,
    isTopRated: t.isTopRated,
    bio,
    longBio: t.longBio?.trim() || bio,
    credentials,
    languages: Array.isArray(t.languages)
      ? (t.languages as string[])
      : ['English'],
    avatarUrl: t.avatarUrl ?? null,
    memberSince: t.createdAt.getFullYear(),
  };
}
