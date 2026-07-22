import type { AdminPracticeUnit } from "@/lib/api/admin";
import type { ReadingPassagePart } from "@/components/admin/content/practice/reading-passage-part-select";
import type { ListeningSectionPart } from "@/components/admin/content/practice/listening-section-part-tabs";

export function resolveReadingPassagePart(unit: AdminPracticeUnit): ReadingPassagePart {
  const fromCode = unit.code.match(/^PRA-REA-P([123])-/i)?.[1];
  if (fromCode) return Number(fromCode) as ReadingPassagePart;
  if (unit.passagePart && unit.passagePart >= 1 && unit.passagePart <= 3) {
    return unit.passagePart as ReadingPassagePart;
  }
  return 1;
}

export function resolveListeningSectionPart(unit: AdminPracticeUnit): ListeningSectionPart {
  const fromCode = unit.code.match(/^PRA-LIS-S([1-4])-/i)?.[1];
  if (fromCode) return Number(fromCode) as ListeningSectionPart;
  if (unit.passagePart && unit.passagePart >= 1 && unit.passagePart <= 4) {
    return unit.passagePart as ListeningSectionPart;
  }
  return 1;
}
