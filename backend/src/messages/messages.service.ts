import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ChannelsService } from '../channels/channels.service';
import { hasAtLeastRole } from '../common/permissions';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servers: ServersService,
    private readonly channels: ChannelsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async history(channelId: string, userId: string, cursor?: string, limit = 50) {
    await this.channels.ensureChannelAccess(channelId, userId);

    const take = Math.min(Math.max(limit, 1), 100);
    let before: Date | undefined;
    if (cursor) {
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorMessage) {
        before = cursorMessage.createdAt;
      } else {
        const parsed = new Date(cursor);
        if (!Number.isNaN(parsed.getTime())) before = parsed;
      }
    }

    return this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        author: { select: { id: true, username: true, avatarUrl: true, status: true } },
        reactions: { select: { id: true, emoji: true, userId: true } },
        attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
      },
    });
  }

  async search(channelId: string, userId: string, query: string, limit = 20) {
    await this.channels.ensureChannelAccess(channelId, userId);
    const take = Math.min(Math.max(limit, 1), 50);
    const clean = query.trim();
    if (!clean) return [];

    return this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        content: { contains: clean, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  async send(channelId: string, userId: string, content: string, attachmentIds?: string[]) {
    const clean = content.trim();
    if (!clean && (!attachmentIds || attachmentIds.length === 0)) throw new BadRequestException('Empty message');

    await this.channels.ensureChannelAccess(channelId, userId, true);

    let attachments: { id: string }[] = [];
    if (attachmentIds?.length) {
      attachments = await this.prisma.attachment.findMany({
        where: {
          id: { in: attachmentIds },
          uploaderId: userId,
          messageId: null,
          directMessageId: null,
        },
        select: { id: true },
      });
      if (attachments.length !== attachmentIds.length) {
        throw new BadRequestException('Invalid attachments');
      }
    }

    let msg = await this.prisma.message.create({
      data: { channelId, authorId: userId, content: clean },
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        channelId: true,
        author: { select: { id: true, username: true, avatarUrl: true, status: true } },
        reactions: { select: { id: true, emoji: true, userId: true } },
        attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
      },
    });

    if (attachments.length) {
      await this.prisma.attachment.updateMany({
        where: { id: { in: attachments.map((a) => a.id) } },
        data: { messageId: msg.id },
      });
      const refreshed = await this.prisma.message.findUnique({
        where: { id: msg.id },
        select: {
          id: true,
          content: true,
          createdAt: true,
          editedAt: true,
          deletedAt: true,
          channelId: true,
          author: { select: { id: true, username: true, avatarUrl: true, status: true } },
          reactions: { select: { id: true, emoji: true, userId: true } },
          attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
        },
      });
      if (!refreshed) throw new NotFoundException('Message not found');
      msg = refreshed;
    }

    // realtime push to channel room
    this.realtime.emitMessageCreated(channelId, msg);

    return msg;
  }

  async edit(messageId: string, userId: string, content: string) {
    const clean = content.trim();
    if (!clean) throw new BadRequestException('Empty message');

    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');

    const member = await this.servers.ensureMember(msg.channel.serverId, userId);
    const canEdit = msg.authorId === userId || hasAtLeastRole(member.role, 'MOD');
    if (!canEdit) throw new ForbiddenException('Cannot edit message');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: clean, editedAt: new Date() },
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        channelId: true,
        author: { select: { id: true, username: true, avatarUrl: true, status: true } },
        reactions: { select: { id: true, emoji: true, userId: true } },
        attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
      },
    });

    this.realtime.emitMessageUpdated(msg.channelId, updated);
    return updated;
  }

  async remove(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');

    const member = await this.servers.ensureMember(msg.channel.serverId, userId);
    const canDelete = msg.authorId === userId || hasAtLeastRole(member.role, 'MOD');
    if (!canDelete) throw new ForbiddenException('Cannot delete message');

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: '' },
    });

    this.realtime.emitMessageDeleted(msg.channelId, { id: msg.id, channelId: msg.channelId });
    return { ok: true };
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');

    await this.servers.ensureMember(msg.channel.serverId, userId);
    const reaction = await this.prisma.messageReaction.create({
      data: { messageId, userId, emoji },
      select: { id: true, emoji: true, userId: true, messageId: true },
    });
    this.realtime.emitReactionAdded(msg.channelId, reaction);
    return reaction;
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');

    await this.servers.ensureMember(msg.channel.serverId, userId);
    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    this.realtime.emitReactionRemoved(msg.channelId, { messageId, userId, emoji });
    return { ok: true };
  }

  async markRead(channelId: string, userId: string, messageId?: string) {
    await this.channels.ensureChannelAccess(channelId, userId);

    await this.prisma.channelReadState.upsert({
      where: { channelId_userId: { channelId, userId } },
      update: {
        lastReadMessageId: messageId,
        lastReadAt: new Date(),
      },
      create: {
        channelId,
        userId,
        lastReadMessageId: messageId ?? null,
        lastReadAt: new Date(),
      },
    });

    return { ok: true };
  }
}
