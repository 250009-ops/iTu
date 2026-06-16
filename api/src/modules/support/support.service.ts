import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  TicketPriority,
  TicketType,
  UserRole,
} from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContactInquiryDto } from './dto/contact-inquiry.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

const TICKET_TYPE_MAP: Record<
  NonNullable<CreateSupportTicketDto['type']>,
  TicketType
> = {
  regrade_request: TicketType.REGRADE_REQUEST,
  teacher_no_show: TicketType.TEACHER_NO_SHOW,
  technical_issue: TicketType.TECHNICAL_ISSUE,
  payment_dispute: TicketType.PAYMENT_DISPUTE,
};

const CONTACT_TOPIC_TYPE: Record<ContactInquiryDto['topic'], TicketType> = {
  General: TicketType.TECHNICAL_ISSUE,
  Technical: TicketType.TECHNICAL_ISSUE,
  Billing: TicketType.PAYMENT_DISPUTE,
  Examiner: TicketType.REGRADE_REQUEST,
  Institution: TicketType.TECHNICAL_ISSUE,
  Press: TicketType.TECHNICAL_ISSUE,
};

const CONTACT_TOPIC_PRIORITY: Record<
  ContactInquiryDto['topic'],
  TicketPriority
> = {
  General: TicketPriority.MEDIUM,
  Technical: TicketPriority.HIGH,
  Billing: TicketPriority.HIGH,
  Examiner: TicketPriority.MEDIUM,
  Institution: TicketPriority.MEDIUM,
  Press: TicketPriority.LOW,
};

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
    private settings: SettingsService,
  ) {}

  async createTicket(user: RequestUser, dto: CreateSupportTicketDto) {
    if (dto.enrollmentId && user.role === UserRole.STUDENT) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          id: dto.enrollmentId,
          studentId: user.studentProfileId,
        },
      });
      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }
    }

    const ticketCode = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticketType =
      TICKET_TYPE_MAP[dto.type ?? 'technical_issue'] ??
      TicketType.TECHNICAL_ISSUE;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketCode,
        subject: dto.subject,
        description: dto.message,
        type: ticketType,
        userId: user.id,
        enrollmentId:
          user.role === UserRole.STUDENT ? dto.enrollmentId : undefined,
        slaProgress: 0,
        slaState: 'ON_TRACK',
      },
    });

    const helpPath =
      user.role === UserRole.STUDENT
        ? '/student/help'
        : user.role === UserRole.TEACHER
          ? '/teacher/help'
          : '/admin/help';

    await this.notifications.create(
      user.id,
      'Support request received',
      `We received your request (${ticket.ticketCode}). Our team will respond shortly.`,
      NotificationType.INFO,
      helpPath,
    );

    await this.notifyAdminsOfTicket(
      ticket.ticketCode,
      `${user.name} (${user.role.toLowerCase()}): ${dto.subject}`,
    );

    return {
      id: ticket.id,
      ticketId: ticket.ticketCode,
      status: ticket.status.toLowerCase(),
    };
  }

  async submitContactInquiry(dto: ContactInquiryDto) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const message = dto.message.trim();
    const ticketCode = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const subject = `Contact · ${dto.topic} — ${name}`;
    const description = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Topic: ${dto.topic}`,
      '',
      message,
    ].join('\n');

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketCode,
        subject,
        description,
        type: CONTACT_TOPIC_TYPE[dto.topic],
        priority: CONTACT_TOPIC_PRIORITY[dto.topic],
        slaProgress: 0,
        slaState: 'ON_TRACK',
      },
    });

    const general = (await this.settings.getSection('general')) as {
      supportEmail?: string;
    };
    const supportEmail = general.supportEmail?.trim() || 'support@itestu.uz';

    if (supportEmail && this.mail.isConfigured()) {
      const sent = await this.mail.sendContactInquiryToSupport(
        supportEmail,
        name,
        email,
        dto.topic,
        message,
        ticket.ticketCode,
      );
      if (!sent) {
        this.logger.warn(
          `Contact inquiry ${ticket.ticketCode} saved but email to ${supportEmail} failed`,
        );
      }

      await this.mail.sendContactConfirmationEmail(email, name, ticket.ticketCode);
    } else {
      this.logger.warn(
        `SMTP not configured — contact inquiry ${ticket.ticketCode} from ${email}: ${message}`,
      );
    }

    await this.notifyAdminsOfTicket(
      ticket.ticketCode,
      `${name} (contact form · ${dto.topic}): ${message.slice(0, 120)}`,
    );

    return {
      id: ticket.id,
      ticketId: ticket.ticketCode,
      status: ticket.status.toLowerCase(),
    };
  }

  private async notifyAdminsOfTicket(ticketCode: string, body: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create(
          admin.id,
          'New support ticket',
          `${ticketCode}: ${body}`,
          NotificationType.SYSTEM,
          '/admin/disputes',
        ),
      ),
    );
  }
}
