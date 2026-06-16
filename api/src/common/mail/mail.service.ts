import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  contactConfirmationEmail,
  contactInquiryEmail,
  passwordResetEmail,
  welcomeEmail,
} from './mail.templates';

export type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('SMTP_HOST')?.trim());
  }

  private getFromAddress(): string {
    return (
      this.config.get<string>('SMTP_FROM')?.trim() || 'iTestU <noreply@itestu.uz>'
    );
  }

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

  async send(options: SendMailOptions): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return false;
    }

    const replyTo =
      options.replyTo ??
      this.config.get<string>('SMTP_REPLY_TO')?.trim() ??
      undefined;

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo,
    });
    return true;
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    const { subject, text, html } = passwordResetEmail(name, resetUrl);
    const sent = await this.send({ to, subject, text, html });

    if (!sent) {
      this.logger.warn(
        `SMTP not configured — password reset link for ${to}: ${resetUrl}`,
      );
      return;
    }

    this.logger.log(`Password reset email sent to ${to}`);
  }

  async sendContactInquiryToSupport(
    supportEmail: string,
    name: string,
    fromEmail: string,
    topic: string,
    message: string,
    ticketCode: string,
  ): Promise<boolean> {
    const { subject, text, html } = contactInquiryEmail(
      name,
      fromEmail,
      topic,
      message,
      ticketCode,
    );
    return this.send({
      to: supportEmail,
      subject,
      text,
      html,
      replyTo: fromEmail,
    });
  }

  async sendContactConfirmationEmail(
    to: string,
    name: string,
    ticketCode: string,
  ): Promise<boolean> {
    const { subject, text, html } = contactConfirmationEmail(name, ticketCode);
    return this.send({ to, subject, text, html });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'https://itestu.uz').replace(/\/$/, '');
    const { subject, text, html } = welcomeEmail(name, `${appUrl}/login`);
    const sent = await this.send({ to, subject, text, html });
    if (sent) {
      this.logger.log(`Welcome email sent to ${to}`);
    }
  }

  async verifyConnection(): Promise<{ ok: boolean; message: string }> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return { ok: false, message: 'SMTP_HOST is not set' };
    }

    try {
      await transporter.verify();
      return { ok: true, message: 'SMTP connection verified' };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'SMTP verify failed',
      };
    }
  }
}
