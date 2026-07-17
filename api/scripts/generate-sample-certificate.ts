/**
 * Renders a sample iTestU Mock Test Report Form to docs/sample-mock-certificate.pdf
 * Layout follows the official IELTS TRF grid. Uses fictional demo data only.
 *
 * Run: cd api && npm run cert:sample
 */
import { createWriteStream, mkdirSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';

const BLACK = '#000000';
const GREY = '#dcdcdc';
const BORDER = '#000000';
const STAMP_FILL = '#c4a0a0';
const CENTRE_STAMP_INK = '#2b2b2b';

type Sample = {
  moduleLabel: string;
  centreNumber: string;
  testDate: string;
  candidateNumber: string;
  family: string;
  first: string;
  candidateId: string;
  dateOfBirth: string;
  sex: string;
  schemeCode: string;
  countryOrigin: string;
  nationality: string;
  firstLanguage: string;
  issueDate: string;
  reportFormNumber: string;
  centreName: string;
  skills: { name: string; band: string; cefr: string }[];
  overall: string;
  overallCefr: string;
};

/** Fictional demo data — never use real candidate information in samples. */
const SAMPLE: Sample = {
  moduleLabel: 'ACADEMIC',
  centreNumber: 'IT001',
  testDate: '15/JUL/2026',
  candidateNumber: '100284',
  family: 'Karimova',
  first: 'Dilnoza',
  candidateId: '482910375',
  dateOfBirth: '14/MAR/2004',
  sex: 'F',
  schemeCode: 'Mock Candidate',
  countryOrigin: 'Uzbekistan',
  nationality: 'Uzbekistan',
  firstLanguage: 'Uzbek',
  issueDate: '16/JUL/2026',
  reportFormNumber: '26IT100284MOCK004A',
  centreName: 'Demo Partner Centre',
  skills: [
    { name: 'Listening', band: '7.5', cefr: 'C1' },
    { name: 'Reading', band: '8.0', cefr: 'C1' },
    { name: 'Writing', band: '7.0', cefr: 'C1' },
    { name: 'Speaking', band: '6.0', cefr: 'B2' },
  ],
  overall: '7.0',
  overallCefr: 'C1',
};

const CEFR_LEVELS = ['B1', 'B2', 'C1', 'C2'];
const CEFR_RANK: Record<string, number> = { A2: 0, B1: 1, B2: 2, C1: 3, C2: 4 };

function cefrMet(overallCefr: string, level: string): boolean {
  return (CEFR_RANK[overallCefr] ?? 0) >= (CEFR_RANK[level] ?? 0);
}

type Doc = InstanceType<typeof PDFDocument>;

function hline(doc: Doc, x: number, y: number, w: number) {
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(0.6).stroke(BORDER);
}

function label(doc: Doc, text: string, x: number, y: number, w: number) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(BLACK).text(text, x, y, { width: w });
}

function greyBox(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  opts?: { fontSize?: number; bold?: boolean; align?: 'left' | 'center' },
) {
  doc.rect(x, y, w, h).fillAndStroke(GREY, BORDER);
  doc
    .font(opts?.bold === false ? 'Helvetica' : 'Helvetica-Bold')
    .fontSize(opts?.fontSize ?? 10)
    .fillColor(BLACK)
    .text(value, x + 4, y + h / 2 - (opts?.fontSize ?? 10) / 2 + 1, {
      width: w - 8,
      align: opts?.align ?? 'left',
    });
}

function whiteBox(doc: Doc, x: number, y: number, w: number, h: number, value: string) {
  doc.rect(x, y, w, h).stroke(BORDER);
  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .fillColor(BLACK)
    .text(value, x + 4, y + h / 2 - 5, { width: w - 8 });
}

function drawItestuValidationStamp(
  doc: Doc,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const size = Math.min(boxW * 0.58, boxH * 0.62, 52);
  const radius = Math.max(6, Math.round(size * 0.16));
  const x = boxX + (boxW - size) / 2;
  const y = boxY + (boxH - size) / 2;

  doc.roundedRect(x, y, size, size, radius).fill(STAMP_FILL);

  const padLeft = size * 0.1;
  const padBottom = size * 0.1;
  const fontSize = Math.round(size * 0.24);
  doc
    .font('Helvetica-Bold')
    .fontSize(fontSize)
    .fillColor('#ffffff')
    .text('iTu', x + padLeft, y + size - padBottom - fontSize, {
      lineBreak: false,
    });
}

function drawCentreStampName(doc: Doc, name: string, boxX: number, boxY: number, boxW: number, boxH: number) {
  doc
    .font('Times-Bold')
    .fontSize(10)
    .fillColor(CENTRE_STAMP_INK)
    .text(name.toUpperCase(), boxX + 6, boxY + boxH / 2 - 6, {
      width: boxW - 12,
      align: 'center',
      characterSpacing: 1.1,
    });
}

function metaField(doc: Doc, title: string, value: string, x: number, y: number, w: number) {
  label(doc, title, x, y, w);
  greyBox(doc, x, y + 11, w, 20, value, { fontSize: 10, align: 'left' });
}

function candidateRow(
  doc: Doc,
  title: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  boxW: number,
  boxH = 18,
) {
  label(doc, title, x, y + 4, labelW);
  greyBox(doc, x + labelW + 6, y, boxW, boxH, value);
  return y + boxH + 5;
}

function inlineFieldRow(
  doc: Doc,
  x: number,
  y: number,
  labelW: number,
  boxW: number,
  fields: { label: string; value: string; flex: number }[],
) {
  const gap = 8;
  const totalFlex = fields.reduce((sum, field) => sum + field.flex, 0);
  const available = boxW - gap * (fields.length - 1);
  let cursorX = x + labelW + 6;
  const labelY = y;
  const boxY = y + 11;
  const boxH = 18;

  for (const field of fields) {
    const width = (available * field.flex) / totalFlex;
    label(doc, field.label, cursorX, labelY, width);
    whiteBox(doc, cursorX, boxY, width, boxH, field.value);
    cursorX += width + gap;
  }

  return boxY + boxH + 5;
}

function main() {
  const outDir = join(__dirname, '..', '..', 'docs');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'sample-mock-certificate.pdf');
  const tmpPath = join(outDir, '.sample-mock-certificate.tmp.pdf');

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const stream = createWriteStream(tmpPath);
  doc.pipe(stream);

  const pageW = 595.28;
  const M = 32;
  const x0 = M;
  const W = pageW - 2 * M;
  let y = M;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(30).fillColor(BLACK).text('iTestU', x0, y);
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('TM', x0 + doc.widthOfString('iTestU') + 2, y + 4);

  const modW = 108;
  const modH = 26;
  doc.rect(x0 + W - modW, y + 2, modW, modH).stroke(BORDER);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(SAMPLE.moduleLabel, x0 + W - modW, y + 10, { width: modW, align: 'center' });

  y += 34;
  doc.font('Helvetica-Bold').fontSize(11).text('Mock Test Report Form', x0, y);
  y += 18;

  // NOTE
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('NOTE', x0, y, { continued: true })
    .font('Helvetica-Oblique')
    .text(
      '   This document is a practice mock report issued by iTestU. It mirrors the layout of the IELTS Test Report Form ' +
        'for preparation purposes only and is not an official IELTS document. It is recommended that the candidate\u2019s ' +
        'language ability be re-assessed after two years from the date of the mock test.',
      { width: W, lineGap: 1 },
    );
  y += 28;

  doc
    .font('Helvetica')
    .fontSize(6.8)
    .fillColor(BLACK)
    .text(
      'Mock examinations are delivered by iTestU and partner centres. This form is not issued by or affiliated with the ' +
        'British Council, IDP IELTS, or Cambridge University Press & Assessment.',
      x0,
      y,
      { width: W, lineGap: 1 },
    );
  y += 22;

  // Centre / date / candidate number
  const colW = (W - 16) / 3;
  metaField(doc, 'Centre Number', SAMPLE.centreNumber, x0, y, colW);
  metaField(doc, 'Test Date', SAMPLE.testDate, x0 + colW + 8, y, colW);
  metaField(doc, 'Candidate Number', SAMPLE.candidateNumber, x0 + 2 * (colW + 8), y, colW);
  y += 38;

  hline(doc, x0, y, W);
  y += 8;

  // ── Candidate details ───────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(10).text('Candidate Details', x0, y);
  y += 14;

  const labelW = 118;
  const photoW = 96;
  const photoH = 118;
  const boxW = W - labelW - photoW - 18;
  const detailsTop = y;

  y = candidateRow(doc, 'Family Name', SAMPLE.family, x0, y, labelW, boxW);
  y = candidateRow(doc, 'First Name', SAMPLE.first, x0, y, labelW, boxW);
  y = candidateRow(doc, 'Candidate ID', SAMPLE.candidateId, x0, y, labelW, boxW);

  y = inlineFieldRow(doc, x0, y, labelW, boxW, [
    { label: 'Date of Birth', value: SAMPLE.dateOfBirth, flex: 1.45 },
    { label: 'Sex (M/F)', value: SAMPLE.sex, flex: 0.55 },
    { label: 'Scheme Code', value: SAMPLE.schemeCode, flex: 1.2 },
  ]);

  y = candidateRow(doc, 'Country or Region of Origin', SAMPLE.countryOrigin, x0, y, labelW, boxW);
  y = candidateRow(doc, 'Country of Nationality', SAMPLE.nationality, x0, y, labelW, boxW);
  y = candidateRow(doc, 'First Language', SAMPLE.firstLanguage, x0, y, labelW, boxW);

  const photoX = x0 + W - photoW;
  doc.rect(photoX, detailsTop, photoW, photoH).stroke(BORDER);
  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('DK', photoX, detailsTop + photoH / 2 - 14, { width: photoW, align: 'center' });

  y = Math.max(y, detailsTop + photoH) + 10;
  hline(doc, x0, y, W);
  y += 8;

  // ── Test results ────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(10).text('Test Results', x0, y);
  y += 14;

  const skillColW = 74;
  const bandW = 34;
  const cefrW = 26;
  const skillGap = 6;
  SAMPLE.skills.forEach((skill, i) => {
    const sx = x0 + i * (skillColW + skillGap);
    doc.font('Helvetica-Bold').fontSize(8).text(skill.name, sx, y, { width: skillColW });
    greyBox(doc, sx, y + 12, bandW, 24, skill.band, { fontSize: 11, align: 'center' });
    whiteBox(doc, sx + bandW + 3, y + 12, cefrW, 24, skill.cefr);
  });

  const ovX = x0 + W - 92;
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .text('Overall', ovX, y, { width: 92, align: 'center' })
    .text('Band Score', ovX, y + 8, { width: 92, align: 'center' });
  greyBox(doc, ovX + 14, y + 22, 64, 28, SAMPLE.overall, { fontSize: 14, align: 'center' });
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(SAMPLE.overallCefr, ovX + 14, y + 52, { width: 64, align: 'center' });

  y += 68;
  hline(doc, x0, y, W);
  y += 8;

  // ── Comments + stamps ─────────────────────────────────────────────────
  const commentsW = W * 0.46;
  const stampW = (W - commentsW - 16) / 2;
  const stampH = 78;

  label(doc, 'Administrator Comments', x0, y, commentsW);
  doc.rect(x0, y + 11, commentsW, stampH).stroke(BORDER);

  const centreX = x0 + commentsW + 8;
  label(doc, 'Centre Stamp', centreX, y, stampW);
  doc.rect(centreX, y + 11, stampW, stampH).stroke(BORDER);
  drawCentreStampName(doc, SAMPLE.centreName, centreX, y + 11, stampW, stampH);

  const valX = centreX + stampW + 8;
  label(doc, 'Validation stamp', valX, y, stampW);
  doc.rect(valX, y + 11, stampW, stampH).stroke(BORDER);
  drawItestuValidationStamp(doc, valX, y + 11, stampW, stampH);

  y += stampH + 22;

  // Signature + issue date
  doc
    .moveTo(x0, y + 14)
    .lineTo(x0 + 180, y + 14)
    .lineWidth(0.6)
    .stroke(BORDER);
  label(doc, 'Administrator\u2019s Signature', x0, y + 18, 180);
  label(doc, 'Issue Date', x0 + W - 120, y - 2, 120);
  greyBox(doc, x0 + W - 120, y + 11, 120, 20, SAMPLE.issueDate, { fontSize: 9.5 });

  y += 42;

  // ── Footer: CEFR + reference numbers ──────────────────────────────────
  label(doc, 'CEFR Level', x0, y, 60);
  doc.font('Helvetica-Bold').fontSize(7).text('Threshold Met', x0, y + 8, { width: 60 });

  CEFR_LEVELS.forEach((level, i) => {
    const cx = x0 + i * 28;
    doc.font('Helvetica-Bold').fontSize(8).text(level, cx, y + 20, { width: 22, align: 'center' });
    doc.rect(cx, y + 30, 22, 16).stroke(BORDER);
    if (cefrMet(SAMPLE.overallCefr, level)) {
      doc
        .moveTo(cx + 5, y + 38)
        .lineTo(cx + 9, y + 42)
        .lineTo(cx + 17, y + 33)
        .lineWidth(1.2)
        .stroke(BLACK);
    }
  });

  const refX = x0 + 130;
  const refW = W - 130;
  label(doc, 'Unique Reference Number', refX, y, refW);
  greyBox(doc, refX, y + 11, refW, 18, `ITU/MOCK/${SAMPLE.centreNumber}/${SAMPLE.candidateNumber}`);
  label(doc, 'Test Report Form Number', refX, y + 36, refW);
  greyBox(doc, refX, y + 47, refW, 18, SAMPLE.reportFormNumber);

  y += 72;
  doc
    .font('Helvetica-Oblique')
    .fontSize(7)
    .text(
      'Recognising organisations must verify this mock score at verify.itestu.uz',
      x0,
      y,
      { width: W, align: 'left' },
    );

  doc.end();

  stream.on('finish', () => {
    try {
      try {
        unlinkSync(outPath);
      } catch {
        // ignore — target may be locked by a PDF viewer
      }
      renameSync(tmpPath, outPath);
      console.log(`Sample certificate written to ${outPath}`);
    } catch {
      const fallback = join(outDir, 'sample-mock-certificate-v2.pdf');
      renameSync(tmpPath, fallback);
      console.log(
        `Could not replace ${outPath} (close it if open). Wrote ${fallback}`,
      );
    }
  });
}

main();
