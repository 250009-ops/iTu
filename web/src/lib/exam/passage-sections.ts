/** Default section letters when passage markers are not set. */
export const DEFAULT_SECTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export function normalizePassageMarker(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 1);
}

/** Next unused uppercase paragraph marker (A–Z) for admin passage editing. */
export function nextPassageMarker(paragraphs: { marker?: string }[]): string {
  const used = new Set(
    (paragraphs ?? [])
      .map((p) => normalizePassageMarker(p.marker ?? ""))
      .filter(Boolean),
  );
  for (let i = 0; i < 26; i++) {
    const id = String.fromCharCode(65 + i);
    if (!used.has(id)) return id;
  }
  return String.fromCharCode(65 + Math.min(paragraphs.length, 25));
}

export function passageSectionLabels(
  paragraphs: { marker?: string }[] | undefined,
  override?: string[],
): string[] {
  if (override && override.length > 0) return override;
  const markers = (paragraphs ?? [])
    .map((p) => normalizePassageMarker(p.marker ?? ""))
    .filter(Boolean);
  return markers.length > 0 ? markers : DEFAULT_SECTION_LABELS;
}

export function parseSectionLabelsInput(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function formatSectionLabelsInput(labels: string[] | undefined): string {
  return (labels ?? []).join(", ");
}
