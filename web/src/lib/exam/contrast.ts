export type ContrastMode = "black-on-white" | "white-on-black" | "yellow-on-black";

export const CONTRAST_OPTIONS: {
  id: ContrastMode;
  label: string;
  previewBg: string;
  previewFg: string;
}[] = [
  { id: "black-on-white", label: "Black on white", previewBg: "#ffffff", previewFg: "#000000" },
  { id: "white-on-black", label: "White on black", previewBg: "#000000", previewFg: "#ffffff" },
  { id: "yellow-on-black", label: "Yellow on black", previewBg: "#000000", previewFg: "#ffff00" },
];

export type ContrastTheme = {
  bg: string;
  fg: string;
  muted: string;
  bar: string;
  border: string;
  inputBg: string;
  inputFg: string;
  panelBg: string;
};

export const CONTRAST_THEMES: Record<ContrastMode, ContrastTheme> = {
  "black-on-white": {
    bg: "#ffffff",
    fg: "#000000",
    muted: "#444444",
    bar: "#ececec",
    border: "#c4c4c4",
    inputBg: "#ffffff",
    inputFg: "#000000",
    panelBg: "#ffffff",
  },
  "white-on-black": {
    bg: "#000000",
    fg: "#ffffff",
    muted: "#cccccc",
    bar: "#1a1a1a",
    border: "#444444",
    inputBg: "#ffffff",
    inputFg: "#000000",
    panelBg: "#111111",
  },
  "yellow-on-black": {
    bg: "#000000",
    fg: "#ffff00",
    muted: "#e6e600",
    bar: "#1a1a1a",
    border: "#666600",
    inputBg: "#ffffff",
    inputFg: "#000000",
    panelBg: "#111111",
  },
};

export function contrastStorageKey(sessionId: string) {
  return `exam-contrast:${sessionId}`;
}

/** @deprecated migrated to {@link contrastStorageKey} */
export function legacyContrastStorageKey(sessionId: string) {
  return `reading-contrast:${sessionId}`;
}
