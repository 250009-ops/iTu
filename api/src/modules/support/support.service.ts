import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  NotificationType,
  TicketPriority,
  TicketType,
  UserRole,
} from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import {
  helpPathForReporter,
  resolveCentreTicketInstitutionId,
} from '../../common/support/support-routing';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContactInquiryDto } from './dto/contact-inquiry.dto';
import {
  CreateSupportTicketDto,
  SupportTicketType,
} from './dto/create-support-ticket.dto';

const TICKET_TYPE_MAP: Record<SupportTicketType, TicketType> = {
  regrade_request: TicketType.REGRADE_REQUEST,
  teacher_no_show: TicketType.TEACHER_NO_SHOW,
  technical_issue: TicketType.TECHNICAL_ISSUE,
  payment_dispute: TicketType.PAYMENT_DISPUTE,
  student_conduct: TicketType.STUDENT_CONDUCT,
};

const DEFAULT_PRIORITY: Record<TicketType, TicketPriority> = {
  REGRADE_REQUEST: TicketPriority.MEDIUM,
  TEACHER_NO_SHOW: TicketPriority.HIGH,
  TECHNICAL_ISSUE: TicketPriority.MEDIUM,
  PAYMENT_DISPUTE: TicketPriority.HIGH,
  STUDENT_CONDUCT: TicketPriority.HIGH,
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
    let enrollmentId: string | undefined;

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
      enrollmentId = enrollment.id;
    }

    if (dto.enrollmentId && user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId;
      if (!teacherId) {
        throw new BadRequestException('Teacher profile required');
      }
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          id: dto.enrollmentId,
          OR: [
            { speakingTeacherId: teacherId },
            { writingTeacherId: teacherId },
          ],
        },
      });
      if (!enrollment) {
        throw new NotFoundException(
          'Enrollment not found or not linked to your sessions',
        );
      }
      enrollmentId = enrollment.id;
    }

    const ticketCode = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticketType =
      TICKET_TYPE_MAP[dto.type ?? 'technical_issue'] ??
      TicketType.TECHNICAL_ISSUE;

    const description = dto.relatedRef?.trim()
      ? `Related: ${dto.relatedRef.trim()}\n\n${dto.message.trim()}`
      : dto.message.trim();

    const centreInstitutionId = await resolveCentreTicketInstitutionId(
      this.prisma,
      user,
    );

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketCode,
        subject: dto.subject.trim(),
        description,
        type: ticketType,
        priority: DEFAULT_PRIORITY[ticketType],
        userId: user.id,
        institutionId: centreInstitutionId ?? undefined,
        enrollmentId,
        slaProgress: 0,
        slaState: 'ON_TRACK',
      },
    });

    const centreMember = centreInstitutionId != null;
    const helpPath = helpPathForReporter(user.role, centreMember);

    await this.notifications.create(
      user.id,
      centreMember ? 'Request sent to your centre' : 'Support request received',
      centreMember
        ? `Your centre received your request (${ticket.ticketCode}). They will follow up with you.`
        : `We received your request (${ticket.ticketCode}). Our team will respond shortly.`,
      NotificationType.INFO,
      helpPath,
    );

    if (centreInstitutionId) {
      await this.notifyInstitutionAdminsOfTicket(
        centreInstitutionId,
        ticket.ticketCode,
        `${user.name} (${user.role.toLowerCase()}): ${dto.subject}`,
      );
    } else {
      await this.notifyPlatformAdminsOfTicket(
        ticket.ticketCode,
        `${user.name} (${user.role.toLowerCase()}): ${dto.subject}`,
      );
    }

    return {
      id: ticket.id,
      ticketId: ticket.ticketCode,
      status: ticket.status.toLowerCase(),
      type: ticket.type.toLowerCase(),
      priority: ticket.priority.toLowerCase(),
    };
  }

  async listMyTickets(user: RequestUser) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        ticketCode: true,
        subject: true,
        type: true,
        priority: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketId: t.ticketCode,
      subject: t.subject,
      type: t.type.toLowerCase(),
      priority: t.priority.toLowerCase(),
      status: t.status.toLowerCase(),
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
    }));
  }

  async getCentreContact(user: RequestUser) {
    const institutionId = await resolveCentreTicketInstitutionId(
      this.prisma,
      user,
    );
    if (!institutionId) {
      throw new NotFoundException('No linked centre found');
    }

    const centre = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        id: true,
        name: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        city: true,
      },
    });
    if (!centre) {
      throw new NotFoundException('Centre not found');
    }

    return {
      id: centre.id,
      name: centre.name,
      contactName: centre.contactName,
      contactEmail: centre.contactEmail,
      contactPhone: centre.contactPhone,
      city: centre.city,
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

    await this.notifyPlatformAdminsOfTicket(
      ticket.ticketCode,
      `${name} (contact form · ${dto.topic}): ${message.slice(0, 120)}`,
    );

    return {
      id: ticket.id,
      ticketId: ticket.ticketCode,
      status: ticket.status.toLowerCase(),
    };
  }

  private async notifyPlatformAdminsOfTicket(ticketCode: string, body: string) {
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

  private async notifyInstitutionAdminsOfTicket(
    institutionId: string,
    ticketCode: string,
    body: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { institutionId, role: UserRole.INSTITUTION },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create(
          admin.id,
          'New centre request',
          `${ticketCode}: ${body}`,
          NotificationType.SYSTEM,
          '/institution/requests',
        ),
      ),
    );
  }
}
