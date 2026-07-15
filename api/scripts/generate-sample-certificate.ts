/**
 * Renders a sample iTestU Mock Test Report Form to docs/sample-mock-certificate.pdf
 * so the certificate design can be reviewed without running the web app.
 *
 * Run: cd api && npx tsx scripts/generate-sample-certificate.ts
 */
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';

const NAVY = '#0f1e3d';
const BRAND_RED = '#E31837';
const BOX_BG = '#eef1f4';
const BOX_BORDER = '#c7d0da';
const INK = '#1f2937';
const MUTED = '#64748b';

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
  country: string;
  firstLanguage: string;
  issueDate: string;
  referenceNumber: string;
  reportFormNumber: string;
  centreName: string;
  centreCity: string;
  skills: { name: string; band: number }[];
  overall: number;
};

const SAMPLE: Sample = {
  moduleLabel: 'Academic',
  centreNumber: 'IT417',
  testDate: '12 July 2026',
  candidateNumber: '002031',
  family: 'Karimova',
  first: 'Dilnoza',
  candidateId: '482910375',
  dateOfBirth: '14 March 2004',
  sex: 'F',
  country: 'Uzbekistan',
  firstLanguage: 'Uzbek',
  issueDate: '13 July 2026',
  referenceNumber: 'ITU/MOCK-8F3A21/IT417',
  reportFormNumber: '47IT002031',
  centreName: 'Cambridge Academy Tashkent',
  centreCity: 'Tashkent',
  skills: [
    { name: 'Listening', band: 7.5 },
    { name: 'Reading', band: 7.0 },
    { name: 'Writing', band: 6.5 },
    { name: 'Speaking', band: 7.5 },
  ],
  overall: 7.0,
};

function bandToCefr(band: number): string {
  if (band >= 8.5) return 'C2';
  if (band >= 7) return 'C1';
  if (band >= 5.5) return 'B2';
  if (band >= 4) return 'B1';
  return 'A2';
}

const CEFR_THRESHOLDS = ['B1', 'B2', 'C1', 'C2'];
const CEFR_RANK: Record<string, number> = { A2: 0, B1: 1, B2: 2, C1: 3, C2: 4 };
function cefrMet(overall: number, level: string): boolean {
  return CEFR_RANK[bandToCefr(overall)] >= CEFR_RANK[level];
}

type Doc = InstanceType<typeof PDFDocument>;

function field(
  doc: Doc,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h = 22,
) {
  doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text(label, x, y);
  const boxY = y + 10;
  doc
    .roundedRect(x, boxY, w, h, 2)
    .fillAndStroke(BOX_BG, BOX_BORDER);
  doc
    .fontSize(9)
    .fillColor(INK)
    .font('Helvetica-Bold')
    .text(value, x + 6, boxY + h / 2 - 5, { width: w - 12, ellipsis: true });
  return boxY + h;
}

function main() {
  const outDir = join(__dirname, '..', '..', 'docs');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'sample-mock-certificate.pdf');

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(createWriteStream(outPath));

  const pageW = 595.28;
  const M = 28;
  const innerX = M + 14;
  const innerW = pageW - 2 * innerX;

  // Outer border
  doc
    .rect(M, M, pageW - 2 * M, 841.89 - 2 * M)
    .lineWidth(2)
    .stroke(NAVY);

  let y = M + 20;

  // Header
  doc.roundedRect(innerX, y, 40, 40, 8).fill(BRAND_RED);
  doc
    .fontSize(18)
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .text('iT', innerX, y + 12, { width: 40, align: 'center' });
  doc
    .fontSize(23)
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .text('iTestU', innerX + 50, y + 4);
  doc
    .fontSize(11)
    .fillColor(INK)
    .font('Helvetica')
    .text('Mock Test Report Form', innerX + 50, y + 28);

  // Module box
  const modW = 130;
  doc
    .roundedRect(innerX + innerW - modW, y + 4, modW, 30, 3)
    .lineWidth(1)
    .stroke(NAVY);
  doc
    .fontSize(11)
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .text(SAMPLE.moduleLabel.toUpperCase(), innerX + innerW - modW, y + 13, {
      width: modW,
      align: 'center',
    });

  y += 48;
  doc
    .moveTo(innerX, y)
    .lineTo(innerX + innerW, y)
    .lineWidth(2)
    .stroke(NAVY);
  y += 10;

  // Note
  doc
    .fontSize(7)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(
      'NOTE   This Mock Test Report Form is issued by iTestU as a practice assessment of the candidate\u2019s English ' +
        'language ability. It simulates the format of the IELTS test but is not an official IELTS Test Report Form and is not ' +
        'issued by or affiliated with the British Council, IDP: IELTS Australia, or Cambridge Assessment English. Bands are ' +
        'indicative and intended for preparation purposes only.',
      innerX,
      y,
      { width: innerW, lineGap: 1.5 },
    );
  y += 46;

  // Top info row
  const col3 = (innerW - 24) / 3;
  field(doc, 'Centre Number', SAMPLE.centreNumber, innerX, y, col3);
  field(doc, 'Test Date', SAMPLE.testDate, innerX + col3 + 12, y, col3);
  field(
    doc,
    'Candidate Number',
    SAMPLE.candidateNumber,
    innerX + 2 * (col3 + 12),
    y,
    col3,
  );
  y += 44;

  // Candidate details
  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('Candidate Details', innerX, y);
  y += 16;

  const detailW = innerW - 130;
  let dy = y;
  dy = field(doc, 'Family Name', SAMPLE.family, innerX, dy, detailW) + 8;
  dy = field(doc, 'First Name', SAMPLE.first, innerX, dy, detailW) + 8;
  dy = field(doc, 'Candidate ID', SAMPLE.candidateId, innerX, dy, detailW) + 8;
  const triW = (detailW - 20) / 3;
  const triTop = dy;
  field(doc, 'Date of Birth', SAMPLE.dateOfBirth, innerX, triTop, triW);
  field(doc, 'Sex (M/F)', SAMPLE.sex, innerX + triW + 10, triTop, triW);
  dy = field(doc, 'Scheme Code', 'Mock', innerX + 2 * (triW + 10), triTop, triW) + 8;
  dy = field(doc, 'Country or Region of Origin', SAMPLE.country, innerX, dy, detailW) + 8;
  dy = field(doc, 'Country of Nationality', SAMPLE.country, innerX, dy, detailW) + 8;
  dy = field(doc, 'First Language', SAMPLE.firstLanguage, innerX, dy, detailW) + 8;

  // Photo box
  const photoX = innerX + detailW + 12;
  const photoW = 118;
  doc.roundedRect(photoX, y + 10, photoW, 148, 3).fillAndStroke(BOX_BG, BOX_BORDER);
  doc.circle(photoX + photoW / 2, y + 70, 34).fill(NAVY);
  doc
    .fontSize(24)
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .text('DK', photoX, y + 58, { width: photoW, align: 'center' });
  doc
    .fontSize(7)
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .text('CANDIDATE', photoX, y + 148, { width: photoW, align: 'center' });

  y = dy + 6;

  // Test results
  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('Test Results', innerX, y);
  y += 18;
  const skillW = 78;
  SAMPLE.skills.forEach((s, i) => {
    const sx = innerX + i * (skillW + 6);
    doc.fontSize(9).fillColor(NAVY).font('Helvetica-Bold').text(s.name, sx, y);
    doc.roundedRect(sx, y + 12, 40, 34, 2).fillAndStroke(BOX_BG, BOX_BORDER);
    doc
      .fontSize(15)
      .fillColor(INK)
      .font('Helvetica-Bold')
      .text(String(s.band), sx, y + 22, { width: 40, align: 'center' });
    doc.roundedRect(sx + 44, y + 12, 28, 34, 2).fillAndStroke(BOX_BG, BOX_BORDER);
    doc
      .fontSize(10)
      .fillColor(MUTED)
      .font('Helvetica-Bold')
      .text(bandToCefr(s.band), sx + 44, y + 24, { width: 28, align: 'center' });
  });

  // Overall
  const ovX = innerX + innerW - 78;
  doc
    .fontSize(8)
    .fillColor(BRAND_RED)
    .font('Helvetica-Bold')
    .text('Overall Band Score', ovX - 6, y, { width: 84, align: 'center' });
  doc.roundedRect(ovX, y + 12, 72, 40, 3).lineWidth(2).fillAndStroke('#fdeef0', BRAND_RED);
  doc
    .fontSize(20)
    .fillColor(BRAND_RED)
    .font('Helvetica-Bold')
    .text(String(SAMPLE.overall), ovX, y + 22, { width: 72, align: 'center' });

  y += 62;

  // Stamps row
  const commentsW = innerW * 0.42;
  const stampW = innerW * 0.29;
  doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('Administrator Comments', innerX, y);
  doc.roundedRect(innerX, y + 10, commentsW, 90, 2).stroke(BOX_BORDER);
  doc
    .fontSize(8.5)
    .fillColor(INK)
    .font('Helvetica')
    .text(
      'Assessment completed under simulated IELTS conditions. Writing and Speaking sections were graded by ' +
        'certified examiners against official band descriptors. This report reflects the candidate\u2019s performance ' +
        'on the mock examination date.',
      innerX + 8,
      y + 18,
      { width: commentsW - 16, lineGap: 1.5 },
    );

  const centreStampX = innerX + commentsW + 10;
  doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('Centre Stamp', centreStampX, y);
  doc
    .roundedRect(centreStampX, y + 10, stampW, 90, 2)
    .dash(3, { space: 2 })
    .stroke(BOX_BORDER);
  doc.undash();
  doc.circle(centreStampX + stampW / 2, y + 42, 18).fill(NAVY);
  doc
    .fontSize(11)
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .text('iT', centreStampX, y + 36, { width: stampW, align: 'center' });
  doc
    .fontSize(8)
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .text(SAMPLE.centreName, centreStampX + 4, y + 66, {
      width: stampW - 8,
      align: 'center',
    });
  doc
    .fontSize(7)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(SAMPLE.centreCity, centreStampX, y + 86, { width: stampW, align: 'center' });

  const valStampX = centreStampX + stampW + 10;
  const valW = innerX + innerW - valStampX;
  doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('Validation Stamp', valStampX, y);
  doc.roundedRect(valStampX, y + 10, valW, 90, 2).stroke(BOX_BORDER);
  const sealX = valStampX + valW / 2;
  const sealY = y + 55;
  doc.circle(sealX, sealY, 30).lineWidth(1.5).stroke(BRAND_RED);
  doc.circle(sealX, sealY, 24).lineWidth(0.7).stroke(BRAND_RED);
  doc
    .fontSize(12)
    .fillColor(BRAND_RED)
    .font('Helvetica-Bold')
    .text('iTU', sealX - 15, sealY - 9, { width: 30, align: 'center' });
  doc
    .fontSize(6)
    .fillColor(BRAND_RED)
    .font('Helvetica-Bold')
    .text('VERIFIED', sealX - 20, sealY + 4, { width: 40, align: 'center' });

  y += 108;

  // Signature + issue date
  doc
    .fontSize(16)
    .fillColor(NAVY)
    .font('Helvetica-Oblique')
    .text('iTestU Assessment Office', innerX, y);
  doc
    .moveTo(innerX, y + 22)
    .lineTo(innerX + 200, y + 22)
    .lineWidth(1)
    .stroke(INK);
  doc
    .fontSize(7)
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .text("Administrator's Signature", innerX, y + 26);
  field(doc, 'Issue Date', SAMPLE.issueDate, innerX + innerW - 150, y, 150);

  y += 46;
  doc.moveTo(innerX, y).lineTo(innerX + innerW, y).lineWidth(0.7).stroke(BOX_BORDER);
  y += 10;

  // CEFR thresholds
  doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('CEFR Threshold Met', innerX, y);
  CEFR_THRESHOLDS.forEach((level, i) => {
    const cx = innerX + i * 30;
    const cy = y + 12;
    doc.fontSize(8).fillColor(INK).font('Helvetica-Bold').text(level, cx, cy, { width: 20, align: 'center' });
    const met = cefrMet(SAMPLE.overall, level);
    doc.roundedRect(cx, cy + 12, 20, 18, 2).fillAndStroke(met ? '#e7f5ef' : BOX_BG, BOX_BORDER);
    if (met) {
      // Vector checkmark (Helvetica lacks the U+2713 glyph).
      doc
        .moveTo(cx + 6, cy + 21)
        .lineTo(cx + 9, cy + 24)
        .lineTo(cx + 14, cy + 17)
        .lineWidth(1.6)
        .stroke('#059669');
    }
  });

  // Reference numbers
  const refX = innerX + 150;
  const refW = innerX + innerW - refX;
  field(doc, 'Unique Reference Number', SAMPLE.referenceNumber, refX, y, refW);
  field(doc, 'Test Report Form Number', SAMPLE.reportFormNumber, refX, y + 34, refW);

  // Footer
  doc
    .fontSize(7)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(
      'Verify this report at verify.itestu.uz using the Unique Reference Number above. \u00b7 iTestU Computer-Based Testing ' +
        '\u00b7 This document certifies a practice mock examination only.',
      innerX,
      841.89 - M - 24,
      { width: innerW, align: 'center' },
    );

  doc.end();
  console.log(`Sample certificate written to ${outPath}`);
}

main();
