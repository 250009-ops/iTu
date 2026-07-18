import { apiFetch } from "./client";

export type DesktopRelease = {
  platform: string;
  version: string;
  releasedAt: string;
  url: string;
  sha256: string;
  size: number;
};

export type DesktopReleasesAll = {
  version: string;
  releasedAt: string;
  platforms: Record<
    string,
    { url: string; sha256: string; size: number }
  >;
};

export function getDesktopRelease(platform: "windows" | "macos" | "linux") {
  return apiFetch<DesktopRelease>(
    `/releases/desktop/latest?platform=${platform}`,
  );
}

export function getAllDesktopReleases() {
  return apiFetch<DesktopReleasesAll>("/releases/desktop", { auth: false });
}

export function getDesktopReleasePublic(platform: "windows" | "macos" | "linux") {
  return apiFetch<DesktopRelease>(
    `/releases/desktop/latest?platform=${platform}`,
    { auth: false },
  );
}
