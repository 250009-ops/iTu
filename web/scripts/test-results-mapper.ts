/**
 * Smoke test: mapStudentResults must not throw on production-shaped writing criteria.
 * Run: npx tsx scripts/test-results-mapper.ts
 */
import { formatBandDisplay, mapStudentResults } from "../src/lib/api/mappers/student";

const list = [
  {
    enrollmentCode: "ENR-4864",
    mockDate: "2026-06-27T12:10:00.000Z",
    package: "Full Academic Mock 001",
    overallBand: 7,
    pdfUrl: null,
  },
];

const detail = {
  released: true as const,
  enrollmentCode: "ENR-4864",
  mockDate: "2026-06-27T12:10:00.000Z",
  package: "Full Academic Mock 001",
  overallBand: 7,
  skills: [
    {
      skill: "writing",
      band: 6,
      rawScore: null,
      criteriaScores: {
        task1: {
          grammar: 6,
          taskBand: 6.5,
          lexicalResource: 7,
          taskAchievement: 7,
          coherenceCohesion: 6,
        },
        task2: {
          grammar: 5.5,
          taskBand: 6,
          taskResponse: 6.5,
          lexicalResource: 6,
          coherenceCohesion: 6,
        },
      },
    },
    {
      skill: "reading",
      band: 8,
      rawScore: 35,
    },
    {
      skill: "listening",
      band: 7.5,
      rawScore: 34,
    },
    {
      skill: "speaking",
      band: 6.5,
      rawScore: null,
      criteriaScores: {
        grammar: 7,
        pronunciation: 6.5,
        lexicalResource: 6,
        fluencyCoherence: 6,
      },
    },
  ],
};

const mapped = mapStudentResults(list, { "ENR-4864": detail }, "ENR-4864", 7);

if (!mapped) {
  console.error("FAIL: mapStudentResults returned null");
  process.exit(1);
}

const writingParts = mapped.moduleDetails.writing?.parts ?? [];
if (writingParts.length < 4) {
  console.error(`FAIL: expected writing criterion parts, got ${writingParts.length}`);
  process.exit(1);
}

for (const part of writingParts) {
  formatBandDisplay(part.value);
}

formatBandDisplay("6.5");
formatBandDisplay(null);

console.log("OK: mapStudentResults handles nested writing criteria");
console.log(`  overallBand=${mapped.overallBand} writingParts=${writingParts.length}`);
