import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { EmailDispatchService } from '../../common/mail/email-dispatch.service';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private emailDispatch: EmailDispatchService,
  ) {}

  async list(user: RequestUser, unreadOnly = false) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((n) => ({
      id: n.id,
      type: n.type.toLowerCase(),
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  async markRead(user: RequestUser, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });
    return { marked: true };
  }

  async markAllRead(user: RequestUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return { marked: true };
  }

  async create(
    userId: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.INFO,
    link?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type, link },
    });

    void this.emailDispatch
      .sendForNotification(userId, title, body, type, link)
      .catch(() => undefined);

    return notification;
  }
}
