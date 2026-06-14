const HONORIFICS = new Set([
  "dr",
  "dr.",
  "mr",
  "mr.",
  "mrs",
  "mrs.",
  "ms",
  "ms.",
  "prof",
  "prof.",
]);

/** First usable given name, skipping titles like Dr. or Mr. */
export function displayFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const name = parts.find((part) => !HONORIFICS.has(part.toLowerCase()));
  return name ?? parts[0] ?? fullName;
}
