export type DesktopPlatform = "windows" | "macos" | "linux";

export function detectDesktopPlatform(): DesktopPlatform {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";
  if (platform.includes("mac") || ua.includes("mac")) return "macos";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";
  return "windows";
}

export function platformLabel(platform: DesktopPlatform): string {
  switch (platform) {
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return "Windows";
  }
}
