import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  contactConfirmationEmail,
  contactInquiryEmail,
  emailVerificationEmail,
  passwordResetEmail,
  teacherApplicationReceivedEmail,
  teacherApprovedEmail,
  teacherReinstatedEmail,
  teacherSuspendedEmail,
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

  async sendEmailVerificationEmail(
    to: string,
    name: string,
    verifyUrl: string,
  ): Promise<void> {
    const { subject, text, html } = emailVerificationEmail(name, verifyUrl);
    const sent = await this.send({ to, subject, text, html });
    if (sent) {
      this.logger.log(`Email verification sent to ${to}`);
    }
  }

  async sendTeacherApplicationReceived(to: string, name: string): Promise<void> {
    const { subject, text, html } = teacherApplicationReceivedEmail(name);
    const sent = await this.send({ to, subject, text, html });
    if (sent) {
      this.logger.log(`Teacher application confirmation sent to ${to}`);
    }
  }

  async sendTeacherApproved(to: string, name: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'https://itestu.uz').replace(/\/$/, '');
    const { subject, text, html } = teacherApprovedEmail(name, to, `${appUrl}/login`);
    const sent = await this.send({ to, subject, text, html });
    if (sent) {
      this.logger.log(`Teacher approved email sent to ${to}`);
    }
  }

  async sendTeacherSuspended(
    to: string,
    name: string,
    supportEmail = 'support@itestu.uz',
  ): Promise<void> {
    const { subject, text, html } = teacherSuspendedEmail(name, supportEmail);
    const sent = await this.send({ to, subject, text, html });
    if (sent) {
      this.logger.log(`Teacher suspended email sent to ${to}`);
    }
  }

  async sendTeacherReinstated(to: string, name: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'https://itestu.uz').replace(/\/$/, '');
    const { subject, text, html } = teacherReinstatedEmail(name, `${appUrl}/login`);
    const sent = await this.send({ to, subject, text, html });
    if (sent) {
      this.logger.log(`Teacher reinstated email sent to ${to}`);
    }
  }

  private actionLinkHtml(
    name: string,
    intro: string,
    buttonLabel: string,
    url: string,
    footer: string,
  ): { text: string; html: string } {
    const text = `Hi ${name},\n\n${intro}\n\n${buttonLabel}: ${url}\n\n${footer}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <p>Hi ${name},</p>
        <p>${intro}</p>
        <p style="margin:28px 0">
          <a href="${url}" style="background:#e31837;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${buttonLabel}</a>
        </p>
        <p style="color:#64748b;font-size:13px">${footer}</p>
      </div>`;
    return { text, html };
  }

  async sendInstitutionApprovedEmail(
    to: string,
    name: string,
    centerName: string,
    setupUrl: string,
  ): Promise<void> {
    const { text, html } = this.actionLinkHtml(
      name,
      `Great news — <strong>${centerName}</strong> has been approved as a partner institution on iTestU. Set your password to access your institution portal.`,
      'Set your password',
      setupUrl,
      'This link expires in 24 hours. If you did not expect this, you can ignore this email.',
    );
    const sent = await this.send({
      to,
      subject: `${centerName} is approved — set your password`,
      text,
      html,
    });
    if (!sent) {
      this.logger.warn(`SMTP not configured — institution setup link for ${to}: ${setupUrl}`);
      return;
    }
    this.logger.log(`Institution approval email sent to ${to}`);
  }

  async sendInstitutionRejectedEmail(
    to: string,
    name: string,
    centerName: string,
  ): Promise<void> {
    const text =
      `Hi ${name},\n\n` +
      `Thank you for applying to partner with iTestU as ${centerName}.\n\n` +
      `After review we’re unable to approve your application at this time. ` +
      `If you’d like more detail, reply to this email or contact institutions@itestu.uz.\n\n` +
      `You may submit a new application later with updated information.`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <p>Hi ${name},</p>
        <p>Thank you for applying to partner with iTestU as <strong>${centerName}</strong>.</p>
        <p>After review we’re unable to approve your application at this time. If you’d like more detail, reply to this email or contact <a href="mailto:institutions@itestu.uz">institutions@itestu.uz</a>.</p>
        <p style="color:#64748b;font-size:13px">You may submit a new application later with updated information.</p>
      </div>`;
    const sent = await this.send({
      to,
      subject: `Update on your ${centerName} partner application`,
      text,
      html,
    });
    if (!sent) {
      this.logger.warn(`SMTP not configured — institution rejection email for ${to}`);
      return;
    }
    this.logger.log(`Institution rejection email sent to ${to}`);
  }

  async sendInstitutionStudentInviteEmail(
    to: string,
    name: string,
    centerName: string,
    setupUrl: string,
  ): Promise<void> {
    const { text, html } = this.actionLinkHtml(
      name,
      `You signed up with <strong>${centerName}</strong> on iTestU. Verify your email and set a password to access your student portal.`,
      'Verify & set password',
      setupUrl,
      'This link expires in 24 hours. After your center approves your account you can start booking mocks.',
    );
    const sent = await this.send({
      to,
      subject: `Verify your email for ${centerName}`,
      text,
      html,
    });
    if (!sent) {
      this.logger.warn(`SMTP not configured — student verify link for ${to}: ${setupUrl}`);
      return;
    }
    this.logger.log(`Institution student invite sent to ${to}`);
  }

  async sendInstitutionExaminerInviteEmail(
    to: string,
    name: string,
    centerName: string,
    setupUrl: string,
  ): Promise<void> {
    const { text, html } = this.actionLinkHtml(
      name,
      `<strong>${centerName}</strong> invited you to grade IELTS mocks as an examiner on iTestU. Set your password to complete onboarding.`,
      'Set your password',
      setupUrl,
      'This link expires in 24 hours. You will grade only mocks assigned by your center.',
    );
    const sent = await this.send({
      to,
      subject: `${centerName} invited you as an examiner`,
      text,
      html,
    });
    if (!sent) {
      this.logger.warn(`SMTP not configured — examiner setup link for ${to}: ${setupUrl}`);
      return;
    }
    this.logger.log(`Institution examiner invite sent to ${to}`);
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
