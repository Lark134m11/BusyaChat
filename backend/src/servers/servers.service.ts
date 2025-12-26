import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServerRole } from '@prisma/client';
import { hasAtLeastRole, isHigherRole, roleHasPermission, ServerPermission } from '../common/permissions';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ServersService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}

  async myServers(userId: string) {
    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      include: {
        server: { select: { id: true, name: true, iconUrl: true, ownerId: true, createdAt: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...m.server,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async createServer(userId: string, name: string, iconUrl?: string) {
    const clean = name.trim();
    if (clean.length < 2) throw new BadRequestException('Server name too short');

    // create server + owner membership + default "general" text channel
    const server = await this.prisma.server.create({
      data: {
        name: clean,
        iconUrl: iconUrl?.trim() ?? '',
        ownerId: userId,
        members: { create: { userId, role: 'OWNER' } },
        channels: { create: { name: 'general', type: 'TEXT', minRole: 'MEMBER', position: 0 } },
      },
      select: { id: true, name: true, iconUrl: true, ownerId: true, createdAt: true },
    });

    this.realtime.joinServerRoomForUser(userId, server.id);
    return { ...server, role: 'OWNER' };
  }

  async renameServer(serverId: string, userId: string, name: string) {
    const clean = name.trim();
    if (clean.length < 2) throw new BadRequestException('Server name too short');
    await this.ensurePermission(serverId, userId, 'MANAGE_SERVER');
    const server = await this.prisma.server.update({
      where: { id: serverId },
      data: { name: clean },
      select: { id: true, name: true, iconUrl: true, ownerId: true, createdAt: true, updatedAt: true },
    });
    this.realtime.emitServerUpdated(serverId, server);
    return server;
  }

  async deleteServer(serverId: string, userId: string) {
    const member = await this.getMember(serverId, userId);
    if (member.role !== 'OWNER') throw new ForbiddenException('Only owner can delete server');
    await this.prisma.server.delete({ where: { id: serverId } });
    this.realtime.emitServerUpdated(serverId, { id: serverId, deleted: true });
    return { ok: true };
  }

  async listMembers(serverId: string, userId: string) {
    await this.ensureMember(serverId, userId);
    return this.prisma.serverMember.findMany({
      where: { serverId },
      include: {
        user: { select: { id: true, email: true, username: true, avatarUrl: true, status: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(serverId: string, userId: string, targetUserId: string, role: ServerRole) {
    await this.ensurePermission(serverId, userId, 'MANAGE_ROLES');
    if (role === 'OWNER') throw new BadRequestException('Owner role cannot be assigned');

    const actor = await this.getMember(serverId, userId);
    const target = await this.getMember(serverId, targetUserId);

    if (target.role === 'OWNER') throw new ForbiddenException('Cannot change owner role');
    if (actor.role === 'MOD') throw new ForbiddenException('Mods cannot manage roles');

    return this.prisma.serverMember.update({
      where: { serverId_userId: { serverId, userId: targetUserId } },
      data: { role },
    });
  }

  async kickMember(serverId: string, userId: string, targetUserId: string) {
    await this.ensurePermission(serverId, userId, 'KICK_MEMBERS');
    if (userId === targetUserId) throw new BadRequestException('Cannot kick yourself');

    const actor = await this.getMember(serverId, userId);
    const target = await this.getMember(serverId, targetUserId);
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot kick owner');
    if (!isHigherRole(actor.role, target.role)) throw new ForbiddenException('Insufficient role');

    await this.prisma.serverMember.delete({
      where: { serverId_userId: { serverId, userId: targetUserId } },
    });
    return { ok: true };
  }

  async banMember(serverId: string, userId: string, targetUserId: string, reason?: string) {
    await this.ensurePermission(serverId, userId, 'BAN_MEMBERS');
    if (userId === targetUserId) throw new BadRequestException('Cannot ban yourself');

    const actor = await this.getMember(serverId, userId);
    const target = await this.getMember(serverId, targetUserId);
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot ban owner');
    if (!isHigherRole(actor.role, target.role)) throw new ForbiddenException('Insufficient role');

    await this.prisma.serverBan.upsert({
      where: { serverId_userId: { serverId, userId: targetUserId } },
      update: { reason: reason?.trim() ?? '' },
      create: {
        serverId,
        userId: targetUserId,
        createdById: userId,
        reason: reason?.trim() ?? '',
      },
    });

    await this.prisma.serverMember.deleteMany({
      where: { serverId, userId: targetUserId },
    });

    return { ok: true };
  }

  async ensureMember(serverId: string, userId: string) {
    await this.ensureNotBanned(serverId, userId);
    const m = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!m) throw new ForbiddenException('Not a server member');
    return m;
  }

  async ensurePermission(serverId: string, userId: string, permission: ServerPermission) {
    const member = await this.ensureMember(serverId, userId);
    if (!roleHasPermission(member.role, permission)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return member;
  }

  async ensureMinRole(serverId: string, userId: string, minRole: ServerRole) {
    const member = await this.ensureMember(serverId, userId);
    if (!hasAtLeastRole(member.role, minRole)) {
      throw new ForbiddenException('Insufficient role');
    }
    return member;
  }

  async getMember(serverId: string, userId: string) {
    const member = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async ensureNotBanned(serverId: string, userId: string) {
    const ban = await this.prisma.serverBan.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (ban) throw new ForbiddenException('Banned from server');
  }
}
