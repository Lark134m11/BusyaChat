import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { randomBytes } from 'crypto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servers: ServersService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async createInvite(
    serverId: string,
    userId: string,
    maxUses?: number,
    expiresAt?: Date,
  ) {
    await this.servers.ensureMinRole(serverId, userId, 'MOD');

    const code = await this.generateUniqueCode();

    return this.prisma.invite.create({
      data: {
        serverId,
        createdById: userId,
        code,
        maxUses: maxUses && maxUses > 0 ? maxUses : null,
        expiresAt: expiresAt ?? null,
      },
      select: {
        id: true,
        code: true,
        serverId: true,
        maxUses: true,
        uses: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
    });
  }

  async listInvites(serverId: string, userId: string) {
    await this.servers.ensurePermission(serverId, userId, 'MANAGE_SERVER');
    return this.prisma.invite.findMany({
      where: { serverId, revoked: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        serverId: true,
        maxUses: true,
        uses: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
    });
  }

  async revoke(code: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { code } });
    if (!invite) throw new NotFoundException('Invite not found');
    await this.servers.ensurePermission(invite.serverId, userId, 'MANAGE_SERVER');

    await this.prisma.invite.update({
      where: { code },
      data: { revoked: true },
    });

    return { ok: true };
  }

  async join(code: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { code } });
    if (!invite || invite.revoked) throw new NotFoundException('Invite not found');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invite expired');
    }
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new ForbiddenException('Invite exhausted');
    }

    const ban = await this.prisma.serverBan.findUnique({
      where: { serverId_userId: { serverId: invite.serverId, userId } },
    });
    if (ban) throw new ForbiddenException('Banned from server');

    const existing = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: invite.serverId, userId } },
    });
    if (existing) throw new BadRequestException('Already a member');

    await this.prisma.serverMember.create({
      data: { serverId: invite.serverId, userId, role: 'MEMBER' },
    });

    this.realtime.joinServerRoomForUser(userId, invite.serverId);

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    });

    const server = await this.prisma.server.findUnique({
      where: { id: invite.serverId },
      select: { id: true, name: true, iconUrl: true, ownerId: true, createdAt: true },
    });
    if (!server) throw new NotFoundException('Server not found');
    return { ...server, role: 'MEMBER' };
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const code = randomBytes(6).toString('base64url');
      const exists = await this.prisma.invite.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new BadRequestException('Could not generate invite code');
  }
}
