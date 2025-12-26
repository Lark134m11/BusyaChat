import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servers: ServersService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async ensureChannelAccess(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!channel) throw new BadRequestException('Channel not found');
    await this.servers.ensureMember(channel.serverId, userId);
    return channel;
  }

  async history(channelId: string, userId: string, before?: string, limit = 50) {
    await this.ensureChannelAccess(channelId, userId);

    const take = Math.min(Math.max(limit, 1), 100);

    return this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        replyToId: true,
        author: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
  }

  async send(channelId: string, userId: string, content: string, replyToId?: string) {
    const clean = content.trim();
    if (!clean) throw new BadRequestException('Empty message');

    await this.ensureChannelAccess(channelId, userId);

    const msg = await this.prisma.message.create({
      data: { channelId, authorId: userId, content: clean, replyToId: replyToId ?? null },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        replyToId: true,
        channelId: true,
        author: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    // realtime push to channel room
    this.realtime.emitMessageCreated(channelId, msg);

    return msg;
  }
}
