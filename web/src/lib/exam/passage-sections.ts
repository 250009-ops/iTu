/** Default section letters when passage markers are not set. */
export const DEFAULT_SECTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export function passageSectionLabels(
  paragraphs: { marker?: string }[] | undefined,
  override?: string[],
): string[] {
  if (override && override.length > 0) return override;
  const markers = (paragraphs ?? [])
    .map((p) => p.marker?.trim())
    .filter((m): m is string => Boolean(m));
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
