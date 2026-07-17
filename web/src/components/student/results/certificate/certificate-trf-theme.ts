/** Visual tokens aligned with the official IELTS Test Report Form layout. */
export const TRF = {
  black: "#000000",
  ink: "#111111",
  muted: "#333333",
  greyFill: "#dcdcdc",
  greyLight: "#eeeeee",
  white: "#ffffff",
  border: "#000000",
  /** Muted validation-stamp tint — desaturated red, dark enough for white mark. */
  stampFill: "#c4a0a0",
  /** Partner centre name on the centre stamp. */
  centreStampInk: "#2b2b2b",
  centreStampFont: '"Times New Roman", Times, Georgia, serif',
  pageWidthPx: 794,
  pageMinHeightPx: 1123,
  marginPx: 28,
  font: "Arial, Helvetica, sans-serif",
} as const;

export const TRF_SKILL_ORDER = [
  "Listening",
  "Reading",
  "Writing",
  "Speaking",
] as const;
