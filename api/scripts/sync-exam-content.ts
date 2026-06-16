import * as fs from "fs";
import * as path from "path";
import {
  listeningAnswerKey,
  readingAnswerKey,
} from "../../web/src/lib/mock/exam-answer-keys";
import {
  listeningContent,
  readingContent,
  speakingStudentContent,
  writingContent,
} from "../../web/src/lib/mock/exam-content";

const dir = path.join(__dirname, "..", "prisma", "data");
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(
  path.join(dir, "listening.json"),
  JSON.stringify(listeningContent),
);
fs.writeFileSync(path.join(dir, "reading.json"), JSON.stringify(readingContent));
fs.writeFileSync(path.join(dir, "writing.json"), JSON.stringify(writingContent));
fs.writeFileSync(
  path.join(dir, "speaking.json"),
  JSON.stringify(speakingStudentContent),
);
fs.writeFileSync(
  path.join(dir, "listening-answer-key.json"),
  JSON.stringify(listeningAnswerKey),
);
fs.writeFileSync(
  path.join(dir, "reading-answer-key.json"),
  JSON.stringify(readingAnswerKey),
);

console.log("Exam content and answer keys synced to prisma/data/");
