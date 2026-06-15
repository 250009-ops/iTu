import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {}

  private getTransporter(): Transporter | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) {
      return null;
    }

    if (!this.transporter) {
      const port = Number(this.config.get('SMTP_PORT', '587'));
      const secure = this.config.get('SMTP_SECURE', 'false') === 'true';
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: this.config.get<string>('SMTP_USER')?.trim(),
          pass: this.config.get<string>('SMTP_PASS')?.trim(),
        },
      });
    }

    return this.transporter;
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      'iTestU <noreply@itestu.uz>';
    const subject = 'Reset your iTestU password';
    const text = [
      `Hi ${name},`,
      '',
      'We received a request to reset your password.',
      `Reset it here: ${resetUrl}`,
      '',
      'This link expires in 1 hour. If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `
      <p>Hi ${this.escapeHtml(name)},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `;

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(
        `SMTP not configured — password reset link for ${to}: ${resetUrl}`,
      );
      return;
    }

    await transporter.sendMail({ from, to, subject, text, html });
    this.logger.log(`Password reset email sent to ${to}`);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
