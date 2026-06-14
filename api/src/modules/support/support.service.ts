import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  TicketType,
  UserRole,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
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

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create(
          admin.id,
          'New support ticket',
          `${user.name} (${user.role.toLowerCase()}): ${dto.subject}`,
          NotificationType.INFO,
          '/admin/disputes',
        ),
      ),
    );

    return {
      id: ticket.id,
      ticketId: ticket.ticketCode,
      status: ticket.status.toLowerCase(),
    };
  }
}
