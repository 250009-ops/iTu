import { NotificationType, UserRole } from '@prisma/client';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

export async function notifyAdminsOfInstitutionApplication(
  prisma: PrismaService,
  notifications: NotificationsService,
  centerName: string,
  contactEmail: string,
  source: 'telegram' | 'marketing-site',
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });
  if (!admins.length) return;

  const channel = source === 'telegram' ? 'Telegram' : 'website';
  await Promise.all(
    admins.map((admin) =>
      notifications.create(
        admin.id,
        'New partner application',
        `${centerName} (${contactEmail}) via ${channel}`,
        NotificationType.SYSTEM,
        '/admin/institutions',
      ),
    ),
  );
}
