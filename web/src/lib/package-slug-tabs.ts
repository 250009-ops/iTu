/** Maps marketing package slugs to student browse tab ids. */
const PACKAGE_SLUG_TO_TAB: Record<string, string> = {
  "full-academic-mock": "full-academic",
  "speaking-only": "speaking",
  "writing-only": "writing",
  "listening-only": "listening",
  "reading-only": "reading",
};

export function slugToBrowseTab(slug: string): string | null {
  if (PACKAGE_SLUG_TO_TAB[slug]) return PACKAGE_SLUG_TO_TAB[slug];
  if (slug.startsWith("full-academic")) return "full-academic";
  if (slug.startsWith("speaking")) return "speaking";
  if (slug.startsWith("writing")) return "writing";
  if (slug.startsWith("listening")) return "listening";
  if (slug.startsWith("reading")) return "reading";
  return null;
}
