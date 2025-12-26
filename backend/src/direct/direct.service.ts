import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DirectService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}

  async listThreads(userId: string) {
    const memberships = await this.prisma.directMember.findMany({
      where: { userId },
      include: {
        thread: {
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, avatarUrl: true, status: true } },
              },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    return memberships.map((m) => {
      const others = m.thread.members.filter((mem) => mem.userId !== userId).map((mem) => mem.user);
      return {
        id: m.threadId,
        users: others.map((u) => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl, status: u.status })),
        lastMessage: m.thread.messages[0] ?? null,
      };
    });
  }

  async startThread(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new BadRequestException('Cannot DM yourself');

    const existing = await this.findThreadBetween(userId, otherUserId);
    if (existing) return this.threadSummary(existing.id, userId);

    const thread = await this.prisma.directThread.create({
      data: {
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      select: { id: true, createdAt: true },
    });

    this.realtime.joinDirectRoomForUser(userId, thread.id);
    this.realtime.joinDirectRoomForUser(otherUserId, thread.id);

    const summaryForOwner = await this.threadSummary(thread.id, userId);
    const summaryForOther = await this.threadSummary(thread.id, otherUserId);

    this.realtime.emitDirectThreadCreated(userId, summaryForOwner);
    this.realtime.emitDirectThreadCreated(otherUserId, summaryForOther);

    return summaryForOwner;
  }

  async history(threadId: string, userId: string, cursor?: string, limit = 50) {
    await this.ensureThreadMember(threadId, userId);
    const take = Math.min(Math.max(limit, 1), 100);
    let before: Date | undefined;
    if (cursor) {
      const cursorMessage = await this.prisma.directMessage.findUnique({
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

    return this.prisma.directMessage.findMany({
      where: {
        threadId,
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

  async search(threadId: string, userId: string, query: string, limit = 20) {
    await this.ensureThreadMember(threadId, userId);
    const take = Math.min(Math.max(limit, 1), 50);
    const clean = query.trim();
    if (!clean) return [];

    return this.prisma.directMessage.findMany({
      where: {
        threadId,
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

  async send(threadId: string, userId: string, content: string, attachmentIds?: string[]) {
    const clean = content.trim();
    if (!clean && (!attachmentIds || attachmentIds.length === 0)) throw new BadRequestException('Empty message');

    await this.ensureThreadMember(threadId, userId);

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

    let msg = await this.prisma.directMessage.create({
      data: { threadId, authorId: userId, content: clean },
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        threadId: true,
        author: { select: { id: true, username: true, avatarUrl: true, status: true } },
        reactions: { select: { id: true, emoji: true, userId: true } },
        attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
      },
    });

    if (attachments.length) {
      await this.prisma.attachment.updateMany({
        where: { id: { in: attachments.map((a) => a.id) } },
        data: { directMessageId: msg.id },
      });
      const refreshed = await this.prisma.directMessage.findUnique({
        where: { id: msg.id },
        select: {
          id: true,
          content: true,
          createdAt: true,
          editedAt: true,
          deletedAt: true,
          threadId: true,
          author: { select: { id: true, username: true, avatarUrl: true, status: true } },
          reactions: { select: { id: true, emoji: true, userId: true } },
          attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
        },
      });
      if (!refreshed) throw new NotFoundException('Message not found');
      msg = refreshed;
    }

    this.realtime.emitDirectMessageCreated(threadId, msg);
    return msg;
  }

  async edit(messageId: string, userId: string, content: string) {
    const clean = content.trim();
    if (!clean) throw new BadRequestException('Empty message');

    const msg = await this.prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');

    await this.ensureThreadMember(msg.threadId, userId);
    if (msg.authorId !== userId) throw new ForbiddenException('Cannot edit message');

    const updated = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { content: clean, editedAt: new Date() },
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        threadId: true,
        author: { select: { id: true, username: true, avatarUrl: true, status: true } },
        reactions: { select: { id: true, emoji: true, userId: true } },
        attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
      },
    });

    this.realtime.emitDirectMessageUpdated(msg.threadId, updated);
    return updated;
  }

  async remove(messageId: string, userId: string) {
    const msg = await this.prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');

    await this.ensureThreadMember(msg.threadId, userId);
    if (msg.authorId !== userId) throw new ForbiddenException('Cannot delete message');

    await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: '' },
    });

    this.realtime.emitDirectMessageDeleted(msg.threadId, { id: msg.id, threadId: msg.threadId });
    return { ok: true };
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const msg = await this.prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    await this.ensureThreadMember(msg.threadId, userId);

    const reaction = await this.prisma.directMessageReaction.create({
      data: { directMessageId: messageId, userId, emoji },
      select: { id: true, emoji: true, userId: true, directMessageId: true },
    });
    this.realtime.emitDirectReactionAdded(msg.threadId, reaction);
    return reaction;
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const msg = await this.prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    await this.ensureThreadMember(msg.threadId, userId);

    await this.prisma.directMessageReaction.deleteMany({
      where: { directMessageId: messageId, userId, emoji },
    });
    this.realtime.emitDirectReactionRemoved(msg.threadId, { directMessageId: messageId, userId, emoji });
    return { ok: true };
  }

  async markRead(threadId: string, userId: string, messageId?: string) {
    await this.ensureThreadMember(threadId, userId);

    await this.prisma.directReadState.upsert({
      where: { threadId_userId: { threadId, userId } },
      update: { lastReadMessageId: messageId, lastReadAt: new Date() },
      create: { threadId, userId, lastReadMessageId: messageId ?? null, lastReadAt: new Date() },
    });
    return { ok: true };
  }

  private async ensureThreadMember(threadId: string, userId: string) {
    const member = await this.prisma.directMember.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member');
  }

  private async findThreadBetween(userId: string, otherUserId: string) {
    const threads = await this.prisma.directThread.findMany({
      where: { members: { some: { userId } } },
      include: { members: true },
    });

    return threads.find(
      (t) =>
        t.members.length === 2 &&
        t.members.some((m) => m.userId === userId) &&
        t.members.some((m) => m.userId === otherUserId),
    );
  }

  private async threadSummary(threadId: string, userId: string) {
    const thread = await this.prisma.directThread.findUnique({
      where: { id: threadId },
      include: {
        members: { include: { user: { select: { id: true, username: true, avatarUrl: true, status: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    const others = thread.members.filter((m) => m.userId !== userId).map((m) => m.user);
    return {
      id: thread.id,
      users: others.map((u) => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl, status: u.status })),
      lastMessage: thread.messages[0] ?? null,
    };
  }
}
