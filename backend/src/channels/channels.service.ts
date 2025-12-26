import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { ChannelType, ServerRole } from '@prisma/client';
import { hasAtLeastRole, roleHasPermission } from '../common/permissions';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servers: ServersService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(serverId: string, userId: string) {
    const member = await this.servers.ensureMember(serverId, userId);
    return this.prisma.channel.findMany({
      where: {
        serverId,
        ...(member ? { minRole: { in: this.allowedRoles(member.role) } } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        position: true,
        minRole: true,
        serverId: true,
        readStates: {
          where: { userId },
          select: { lastReadMessageId: true, lastReadAt: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, createdAt: true },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async create(serverId: string, userId: string, name: string, minRole?: ServerRole, type?: ChannelType) {
    await this.servers.ensurePermission(serverId, userId, 'MANAGE_CHANNELS');

    const clean = name.trim();
    if (clean.length < 1) throw new BadRequestException('Channel name too short');

    const last = await this.prisma.channel.findFirst({
      where: { serverId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const channel = await this.prisma.channel.create({
      data: {
        serverId,
        name: clean,
        type: type ?? 'TEXT',
        minRole: minRole ?? 'MEMBER',
        position: (last?.position ?? 0) + 1,
      },
      select: { id: true, name: true, type: true, position: true, minRole: true, serverId: true },
    });
    this.realtime.emitChannelCreated(serverId, channel);
    return channel;
  }

  async rename(channelId: string, userId: string, name: string, minRole?: ServerRole) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    await this.servers.ensurePermission(channel.serverId, userId, 'MANAGE_CHANNELS');

    const clean = name.trim();
    if (clean.length < 1) throw new BadRequestException('Channel name too short');

    const updated = await this.prisma.channel.update({
      where: { id: channelId },
      data: { name: clean, minRole: minRole ?? channel.minRole },
      select: { id: true, name: true, type: true, position: true, minRole: true, serverId: true },
    });
    this.realtime.emitChannelUpdated(channel.serverId, updated);
    return updated;
  }

  async remove(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    await this.servers.ensurePermission(channel.serverId, userId, 'MANAGE_CHANNELS');
    await this.prisma.channel.delete({ where: { id: channelId } });
    this.realtime.emitChannelDeleted(channel.serverId, { id: channelId });
    return { ok: true };
  }

  async ensureChannelAccess(channelId: string, userId: string, requireSend = false) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');

    const member = await this.servers.ensureMember(channel.serverId, userId);
    if (!hasAtLeastRole(member.role, channel.minRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    if (requireSend && !roleHasPermission(member.role, 'SEND_MESSAGES')) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return { channel, member };
  }

  private allowedRoles(role: ServerRole): ServerRole[] {
    if (role === 'OWNER') return ['MEMBER', 'MOD', 'ADMIN', 'OWNER'];
    if (role === 'ADMIN') return ['MEMBER', 'MOD', 'ADMIN'];
    if (role === 'MOD') return ['MEMBER', 'MOD'];
    return ['MEMBER'];
  }
}
