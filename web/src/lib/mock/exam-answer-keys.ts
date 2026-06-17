/**
 * Authoritative answer keys for bundled mock exams.
 * Reading answers are derived from passage text in exam-content.ts.
 * Listening answers are fixed mock values (audio tracks are placeholders).
 */
export type ExamAnswerKey = Record<string, string | string[]>;

export const listeningAnswerKey: ExamAnswerKey = {
  "1": "Mitchell",
  "2": "Oak",
  "3": "BN214PQ",
  "4": "900123",
  "5": "yoga",
  "6": "family",
  "7": "seniors",
  "8": "B",
  "9": "B",
  "10": "B",
  "11": "A",
  "12": "C",
  "13": "D",
  "14": "F",
  "15": "H",
  "16": "C",
  "17": "C",
  "18": "A",
  "19": "A",
  "20": "B",
  "21": "B",
  "22": "A",
  "23": "B",
  "24": "A",
  "25": "B",
  "26": "A",
  "27": "A",
  "28": "C",
  "29": "B",
  "30": "C",
  "31": "honey",
  "32": "rooftops",
  "33": "disease",
  "34": "decline",
  "35": "biodiversity",
  "36": "flavour",
  "37": "five",
  "38": "habitat",
  "39": "flowers",
  "40": "subject",
};

export const readingAnswerKey: ExamAnswerKey = {
  "1": "FALSE",
  "2": "TRUE",
  "3": "FALSE",
  "4": "FALSE",
  "5": "FALSE",
  "6": "TRUE",
  "7": "ancestor",
  "8": "Almaty",
  "9": "diversity",
  "10": "fungal",
  "11": "cold",
  "12": "housing",
  "13": "banks",
  "14": "iv",
  "15": "i",
  "16": "vii",
  "17": "iii",
  "18": "v",
  "19": "ii",
  "20": ["B", "C"],
  "21": ["B", "C"],
  "22": "concrete",
  "23": "transpiration",
  "24": "air",
  "25": "evaporation",
  "26": "poorest",
  "27": "B",
  "28": "C",
  "29": "B",
  "30": "C",
  "31": "A",
  "32": "B",
  "33": "C",
  "34": "E",
  "35": "F",
  "36": "NO",
  "37": "YES",
  "38": "NO",
  "39": "NOT_GIVEN",
  "40": "YES",
};

/** Detect scaffold keys generated for empty drafts (`answer1` … `answerN`). */
export function isPlaceholderAnswerKey(
  key: Record<string, string | string[]> | null | undefined,
): boolean {
  if (!key || typeof key !== "object") return true;
  const entries = Object.entries(key);
  if (entries.length === 0) return true;
  return entries.every(
    ([n, v]) =>
      typeof v === "string" && v === `answer${n}`,
  );
}
