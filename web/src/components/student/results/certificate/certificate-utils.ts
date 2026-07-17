import type { CertificateData, SkillId } from "@/lib/api/mappers/student";

export type CefrLevel = "A2" | "B1" | "B2" | "C1" | "C2";

const TRF_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** TRF-style date: 30/SEP/2024 */
export function formatTrfDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = TRF_MONTHS[d.getMonth()] ?? "JAN";
  return `${day}/${month}/${d.getFullYear()}`;
}

export function displayOrDash(value: string | null | undefined): string {
  const text = value?.trim();
  return text ? text : "—";
}

/** Map an IELTS band to its CEFR equivalent (official IELTS → CEFR alignment). */
export function bandToCefr(band: number | null): CefrLevel | "—" {
  if (band == null) return "—";
  if (band >= 8.5) return "C2";
  if (band >= 7) return "C1";
  if (band >= 5.5) return "B2";
  if (band >= 4) return "B1";
  return "A2";
}

/** CEFR thresholds shown in the UKVI-style checklist row. */
export const CEFR_THRESHOLDS: CefrLevel[] = ["B1", "B2", "C1", "C2"];

const CEFR_RANK: Record<CefrLevel, number> = {
  A2: 0,
  B1: 1,
  B2: 2,
  C1: 3,
  C2: 4,
};

export function cefrMet(overallBand: number | null, level: CefrLevel): boolean {
  const achieved = bandToCefr(overallBand);
  if (achieved === "—") return false;
  return CEFR_RANK[achieved] >= CEFR_RANK[level];
}

/** Deterministic positive integer from a string (FNV-1a style). */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Split a full name into TRF-style Family Name / First Name(s). */
export function splitName(fullName: string): {
  family: string;
  first: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: "—", first: "—" };
  if (parts.length === 1) return { family: parts[0]!, first: "—" };
  const family = parts[parts.length - 1]!;
  const first = parts.slice(0, -1).join(" ");
  return { family, first };
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IT";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Derived identifiers presented on the certificate. All values are deterministic
 * per enrollment so the same mock always renders the same reference numbers.
 */
export function deriveIdentifiers(
  enrollmentCode: string,
  centreName: string | null,
  centreCode?: string | null,
) {
  const base = hashString(enrollmentCode);
  const centreNumber =
    centreCode?.trim().toUpperCase().slice(0, 8) ||
    `IT${String((hashString(centreName ?? "ITESTU") % 900) + 100).padStart(3, "0")}`;
  const candidateNumber = String(base % 1000000).padStart(6, "0");
  const candidateId = String(base % 1000000000).padStart(9, "0");
  const referenceNumber = `ITU/${enrollmentCode.toUpperCase()}/${centreNumber}`;
  const reportFormNumber =
    `${(base % 100).toString().padStart(2, "0")}IT${candidateNumber}`.toUpperCase();
  return {
    centreNumber,
    candidateNumber,
    candidateId,
    referenceNumber,
    reportFormNumber,
  };
}

export type CertificateSkill = {
  id: SkillId;
  name: string;
  band: number | null;
};

export type CertificateViewModel = {
  moduleLabel: string;
  centreNumber: string;
  candidateNumber: string;
  candidateId: string;
  referenceNumber: string;
  reportFormNumber: string;
  family: string;
  first: string;
  initials: string;
  country: string;
  dateOfBirth: string;
  sex: string;
  firstLanguage: string;
  schemeCode: string;
  testDateLabel: string;
  issueDateLabel: string;
  overallBand: number | null;
  skills: CertificateSkill[];
  centre: CertificateData["centre"];
};
