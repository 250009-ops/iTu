import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditActionName } from './audit.actions';

export type AuditLogInput = {
  userId?: string | null;
  action: AuditActionName | string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /** Persist an audit row; never throws to callers (best-effort). */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Audit log failed [${input.action}]: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async list(params: { take?: number; skip?: number; entity?: string }) {
    const take = Math.min(params.take ?? 50, 200);
    const skip = params.skip ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: params.entity ? { entity: params.entity } : undefined,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          user: { select: { id: true, email: true, name: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({
        where: params.entity ? { entity: params.entity } : undefined,
      }),
    ]);

    return {
      items: items.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        metadata: row.metadata,
        createdAt: row.createdAt,
        actor: row.user
          ? {
              id: row.user.id,
              email: row.user.email,
              name: row.user.name,
              role: row.user.role.toLowerCase(),
            }
          : null,
      })),
      total,
      take,
      skip,
    };
  }
}
