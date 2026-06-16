import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';

type PdfEnrollment = {
  id: string;
  enrollmentCode: string;
  mockDate: Date;
  studentName: string;
  packageTitle: string;
  examType: string;
  skills: {
    skill: string;
    band: number | null;
    rawScore: number | null;
    feedback?: string | null;
  }[];
  overallBand: number | null;
};

@Injectable()
export class ResultsPdfService {
  private readonly logger = new Logger(ResultsPdfService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async generateForEnrollment(enrollmentId: string): Promise<string | null> {
    const enrollment = await this.loadEnrollment(enrollmentId);
    if (!enrollment) return null;

    try {
      const buffer = await this.buildPdf(enrollment);
      const relativePath = `results/${enrollment.id}.pdf`;
      const publicUrl = await this.storage.saveBuffer(relativePath, buffer);

      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { resultPdfUrl: publicUrl },
      });

      return publicUrl;
    } catch (err) {
      this.logger.warn(
        `Could not generate results PDF for ${enrollmentId}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  async readPdfBuffer(enrollmentId: string): Promise<Buffer | null> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        OR: [{ id: enrollmentId }, { enrollmentCode: enrollmentId }],
      },
      select: { id: true, resultPdfUrl: true },
    });

    if (!enrollment?.resultPdfUrl || !this.storage.isConfigured()) {
      return null;
    }

    return this.storage.readBuffer(`results/${enrollment.id}.pdf`);
  }

  private async loadEnrollment(
    enrollmentId: string,
  ): Promise<PdfEnrollment | null> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        OR: [{ id: enrollmentId }, { enrollmentCode: enrollmentId }],
        resultsStatus: 'RELEASED',
      },
      include: {
        student: { include: { user: true } },
        package: true,
        examSession: {
          include: {
            sectionAttempts: {
              include: {
                writingSubmission: { include: { grade: true } },
                speakingSession: { include: { grade: true } },
              },
            },
          },
        },
      },
    });

    if (!enrollment?.examSession) return null;

    const skills = enrollment.examSession.sectionAttempts.map((a) => ({
      skill: a.skill.toLowerCase(),
      band: a.band,
      rawScore: a.rawScore,
      feedback:
        a.writingSubmission?.grade?.feedback ??
        a.speakingSession?.grade?.feedback,
    }));

    const bands = skills
      .map((s) => s.band)
      .filter((b): b is number => b !== null);
    const overallBand =
      bands.length > 0
        ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2
        : null;

    return {
      id: enrollment.id,
      enrollmentCode: enrollment.enrollmentCode,
      mockDate: enrollment.mockDate,
      studentName: enrollment.student.user.name,
      packageTitle: enrollment.package.title,
      examType: enrollment.student.examType.replace('_', ' '),
      skills,
      overallBand,
    };
  }

  private buildPdf(data: PdfEnrollment): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const dateLabel = data.mockDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      doc
        .fontSize(22)
        .fillColor('#0f172a')
        .text('IELTS Mock — Band Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#64748b').text('itestu', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).fillColor('#334155');
      doc.text(`Candidate: ${data.studentName}`);
      doc.text(`Mock ID: ${data.enrollmentCode}`);
      doc.text(`Package: ${data.packageTitle}`);
      doc.text(`Exam date: ${dateLabel}`);
      doc.text(`Exam type: ${data.examType}`);
      doc.moveDown(1.5);

      doc
        .fontSize(16)
        .fillColor('#0f172a')
        .text(
          `Overall band: ${data.overallBand ?? '—'}`,
        );
      doc.moveDown(1.5);

      doc.fontSize(12).fillColor('#0f172a').text('Module scores');
      doc.moveDown(0.5);

      const skillOrder = ['listening', 'reading', 'writing', 'speaking'];
      for (const skill of skillOrder) {
        const row = data.skills.find((s) => s.skill === skill);
        const label = skill.charAt(0).toUpperCase() + skill.slice(1);
        const band = row?.band ?? '—';
        const raw =
          row?.rawScore != null && skill !== 'writing' && skill !== 'speaking'
            ? ` (raw ${row.rawScore})`
            : '';
        doc
          .fontSize(11)
          .fillColor('#334155')
          .text(`${label.padEnd(12)} ${band}${raw}`);
      }

      const feedbackSkills = data.skills.filter((s) => s.feedback?.trim());
      if (feedbackSkills.length > 0) {
        doc.moveDown(1.5);
        doc.fontSize(12).fillColor('#0f172a').text('Examiner feedback');
        doc.moveDown(0.5);
        for (const row of feedbackSkills) {
          doc
            .fontSize(10)
            .fillColor('#475569')
            .text(
              `${row.skill.charAt(0).toUpperCase() + row.skill.slice(1)}: ${row.feedback}`,
            );
          doc.moveDown(0.5);
        }
      }

      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text(
          'This is a practice mock report generated by itestu. It is not an official IELTS Test Report Form.',
          { align: 'center' },
        );

      doc.end();
    });
  }
}
