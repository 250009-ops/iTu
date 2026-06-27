import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { WritingAnnotationDto } from './writing-ai-evaluation.service';

type CriterionKey = 'ta' | 'cc' | 'lr' | 'gra';

const CRITERION_ORDER: CriterionKey[] = ['ta', 'cc', 'lr', 'gra'];

const CRITERION_COLORS: Record<CriterionKey, string> = {
  ta: '#0284c7',
  cc: '#7c3aed',
  lr: '#059669',
  gra: '#d97706',
};

const TASK1_LABELS: Record<CriterionKey, string> = {
  ta: 'Task Achievement',
  cc: 'Coherence & Cohesion',
  lr: 'Lexical Resource',
  gra: 'Grammatical Range & Accuracy',
};

const TASK2_LABELS: Record<CriterionKey, string> = {
  ta: 'Task Response',
  cc: 'Coherence & Cohesion',
  lr: 'Lexical Resource',
  gra: 'Grammatical Range & Accuracy',
};

const SCORE_KEYS_TASK1: Record<CriterionKey, string> = {
  ta: 'taskAchievement',
  cc: 'coherenceCohesion',
  lr: 'lexicalResource',
  gra: 'grammar',
};

const SCORE_KEYS_TASK2: Record<CriterionKey, string> = {
  ta: 'taskResponse',
  cc: 'coherenceCohesion',
  lr: 'lexicalResource',
  gra: 'grammar',
};

export type WritingTaskPdfData = {
  studentName: string;
  enrollmentCode: string;
  mockDate: Date;
  taskNumber: 1 | 2;
  prompt: string;
  visualCaption?: string | null;
  essayText: string;
  wordCount: number;
  minWords: number;
  annotations: WritingAnnotationDto[];
  suggestedScores: Record<string, number> | null;
  criterionSummaries?: Partial<Record<CriterionKey, string>> | null;
  examinerScores?: Record<string, number | string | undefined> | null;
  examinerTaskBand?: number | null;
  aiStatus?: string;
};

@Injectable()
export class WritingPdfService {
  private readonly logger = new Logger(WritingPdfService.name);

  buildTaskPdf(data: WritingTaskPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderTaskPage(doc, data);
      doc.end();
    });
  }

  async buildBulkWritingPdf(
    reports: WritingTaskPdfData[],
  ): Promise<Buffer | null> {
    if (!reports.length) return null;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      reports.forEach((report, index) => {
        if (index > 0) doc.addPage();
        this.renderTaskPage(doc, report);
      });

      doc.end();
    });
  }

  private renderTaskPage(doc: InstanceType<typeof PDFDocument>, data: WritingTaskPdfData) {
    const labels = data.taskNumber === 1 ? TASK1_LABELS : TASK2_LABELS;
    const scoreKeys =
      data.taskNumber === 1 ? SCORE_KEYS_TASK1 : SCORE_KEYS_TASK2;
    const dateLabel = data.mockDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    doc
      .fontSize(20)
      .fillColor('#0f172a')
      .text(`IELTS Writing — Task ${data.taskNumber}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#64748b').text('itestu · AI-assisted feedback report', {
      align: 'center',
    });
    doc.moveDown(1.2);

    doc.fontSize(11).fillColor('#334155');
    doc.text(`Candidate: ${data.studentName}`);
    doc.text(`Mock ID: ${data.enrollmentCode}`);
    doc.text(`Exam date: ${dateLabel}`);
    doc.text(
      `Word count: ${data.wordCount} / ${data.minWords} minimum${data.wordCount < data.minWords ? ' (below minimum)' : ''}`,
    );
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#0f172a').text('Task prompt');
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#475569')
      .text(data.prompt || 'Prompt unavailable.', { align: 'left' });
    if (data.visualCaption?.trim()) {
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor('#64748b').text(`[Visual: ${data.visualCaption}]`);
    }
    doc.moveDown(1);

    this.renderScoresTable(doc, data, labels, scoreKeys);

    doc.moveDown(0.8);
    doc.fontSize(12).fillColor('#0f172a').text('Candidate response');
    doc.moveDown(0.4);
    const essay = data.essayText?.trim() || '(No response submitted)';
    doc.fontSize(10).fillColor('#1e293b').text(essay, { align: 'left' });
    doc.moveDown(1);

    if (data.aiStatus && data.aiStatus !== 'ready') {
      doc
        .fontSize(9)
        .fillColor('#b45309')
        .text(
          `AI evaluation status: ${data.aiStatus}. Highlights and suggestions may be incomplete.`,
        );
      doc.moveDown(0.6);
    }

    doc.fontSize(12).fillColor('#0f172a').text('AI highlights & suggestions by criterion');
    doc.moveDown(0.5);

    const byCriterion = this.groupByCriterion(data.annotations);
    let hasFeedback = false;

    for (const key of CRITERION_ORDER) {
      const items = byCriterion[key];
      if (!items.length) continue;
      hasFeedback = true;

      if (doc.y > 680) doc.addPage();

      doc
        .fontSize(11)
        .fillColor(CRITERION_COLORS[key])
        .text(labels[key]);
      doc.moveDown(0.3);

      const summary = data.criterionSummaries?.[key]?.trim();
      if (summary) {
        doc.fontSize(9).fillColor('#334155').text(summary);
        doc.moveDown(0.4);
      }

      for (const ann of items) {
        if (doc.y > 700) doc.addPage();

        const excerpt = this.excerptFromSpan(data.essayText, ann.start, ann.end);
        doc.fontSize(9).fillColor('#0f172a').text(`• ${ann.title}`, {
          continued: false,
        });
        if (excerpt) {
          doc
            .fontSize(9)
            .fillColor(CRITERION_COLORS[key])
            .text(`  “${excerpt}”`, { oblique: true });
        }
        doc.fontSize(9).fillColor('#475569').text(`  ${ann.explanation}`);
        if (ann.suggestion?.trim()) {
          doc
            .fontSize(9)
            .fillColor('#0369a1')
            .text(`  Suggestion: ${ann.suggestion}`);
        }
        doc.moveDown(0.4);
      }
      doc.moveDown(0.3);
    }

    if (!hasFeedback) {
      doc
        .fontSize(10)
        .fillColor('#64748b')
        .text(
          'No AI annotations available yet. Re-export after AI evaluation completes.',
        );
    }

    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        'AI suggestions support examiner review; official band scores are assigned by a certified IELTS teacher.',
        { align: 'center' },
      );
  }

  private renderScoresTable(
    doc: InstanceType<typeof PDFDocument>,
    data: WritingTaskPdfData,
    labels: Record<CriterionKey, string>,
    scoreKeys: Record<CriterionKey, string>,
  ) {
    doc.fontSize(12).fillColor('#0f172a').text('Band scores');
    doc.moveDown(0.4);

    const col1 = 50;
    const col2 = 280;
    const col3 = 380;
    const rowH = 16;
    let y = doc.y;

    doc.fontSize(9).fillColor('#64748b');
    doc.text('Criterion', col1, y);
    doc.text('AI suggested', col2, y);
    doc.text('Examiner', col3, y);
    y += rowH;

    for (const key of CRITERION_ORDER) {
      const aiScore = data.suggestedScores?.[scoreKeys[key]];
      const examinerRaw = data.examinerScores?.[scoreKeys[key]];
      const examinerScore =
        typeof examinerRaw === 'number'
          ? examinerRaw
          : typeof examinerRaw === 'string'
            ? Number(examinerRaw)
            : null;

      doc.fontSize(10).fillColor('#334155').text(labels[key], col1, y);
      doc.text(aiScore != null ? String(aiScore) : '—', col2, y);
      doc.text(
        examinerScore != null && !Number.isNaN(examinerScore)
          ? String(examinerScore)
          : '—',
        col3,
        y,
      );
      y += rowH;
    }

    if (data.examinerTaskBand != null) {
      y += 4;
      doc
        .fontSize(10)
        .fillColor('#0f172a')
        .text(`Examiner task band: ${data.examinerTaskBand}`, col1, y);
      y += rowH;
    }

    doc.y = y + 4;
  }

  private groupByCriterion(
    annotations: WritingAnnotationDto[],
  ): Record<CriterionKey, WritingAnnotationDto[]> {
    const map: Record<CriterionKey, WritingAnnotationDto[]> = {
      ta: [],
      cc: [],
      lr: [],
      gra: [],
    };
    for (const ann of annotations) {
      if (map[ann.criterion]) map[ann.criterion].push(ann);
    }
    return map;
  }

  private excerptFromSpan(text: string, start: number, end: number): string {
    if (!text || end <= start) return '';
    const excerpt = text.slice(start, end).trim();
    if (excerpt.length <= 120) return excerpt;
    return `${excerpt.slice(0, 117)}…`;
  }
}
