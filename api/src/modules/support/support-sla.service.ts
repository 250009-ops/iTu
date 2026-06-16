import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeSlaMetrics } from '../../common/support/support-sla';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SupportSlaService {
  private readonly logger = new Logger(SupportSlaService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private settings: SettingsService,
  ) {}

  @Cron('0 */15 * * * *')
  async refreshTicketSlas() {
    await this.run();
  }

  async run() {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: {
        id: true,
        ticketCode: true,
        priority: true,
        status: true,
        createdAt: true,
        slaState: true,
        slaProgress: true,
      },
    });

    if (tickets.length === 0) return;

    const notifications = (await this.settings.getSection('notifications')) as {
      slaBreach?: boolean;
    };
    const notifyOnBreach = notifications.slaBreach !== false;

    const admins = notifyOnBreach
      ? await this.prisma.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true },
        })
      : [];

    let updated = 0;
    let breached = 0;

    for (const ticket of tickets) {
      const { progress, state } = computeSlaMetrics(
        ticket.priority,
        ticket.createdAt,
        ticket.status,
      );

      if (ticket.slaState === state && ticket.slaProgress === progress) {
        continue;
      }

      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { slaProgress: progress, slaState: state },
      });
      updated += 1;

      if (state === 'BREACHED' && ticket.slaState !== 'BREACHED' && notifyOnBreach) {
        breached += 1;
        await Promise.all(
          admins.map((admin) =>
            this.notifications.create(
              admin.id,
              'SLA breach',
              `${ticket.ticketCode} has exceeded its response SLA.`,
              NotificationType.SYSTEM,
              '/admin/disputes',
            ),
          ),
        );
      }
    }

    if (updated > 0) {
      this.logger.log(
        `SLA refresh: ${updated} ticket(s) updated${breached ? `, ${breached} breach alert(s)` : ''}`,
      );
    }
  }
}
