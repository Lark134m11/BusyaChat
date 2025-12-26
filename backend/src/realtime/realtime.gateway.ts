import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../common/auth/ws-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { hasAtLeastRole } from '../common/permissions';

type TypingKey = string;

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private typingTimers = new Map<TypingKey, NodeJS.Timeout>();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwt.verify(token);
      if (payload?.typ && payload.typ !== 'access') throw new Error('Invalid token');
      client.data.user = payload;
      (client as any).user = payload;
    } catch {
      client.disconnect(true);
      return;
    }

    const userId = client.data.user?.sub as string | undefined;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      select: { serverId: true },
    });
    memberships.forEach((m) => client.join(`server:${m.serverId}`));
    client.join(`user:${userId}`);

    const direct = await this.prisma.directMember.findMany({
      where: { userId },
      select: { threadId: true },
    });
    direct.forEach((d) => client.join(`direct:${d.threadId}`));

    memberships.forEach((m) => {
      this.server.to(`server:${m.serverId}`).emit('presence.update', {
        userId,
        status: 'ONLINE',
      });
    });
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user?.sub as string | undefined;
    if (!userId) return;

    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      select: { serverId: true },
    });

    memberships.forEach((m) => {
      this.server.to(`server:${m.serverId}`).emit('presence.update', {
        userId,
        status: 'OFFLINE',
      });
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('channel_join')
  async channelJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const userId = client.data?.user?.sub;
    if (!userId) return { ok: false };

    await this.ensureChannelAccess(channelId, userId);
    await client.join(`channel:${channelId}`);
    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_start')
  async typingStart(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const userId = client.data?.user?.sub;
    if (!userId) return { ok: false };

    await this.ensureChannelAccess(channelId, userId);
    const key: TypingKey = `${channelId}:${userId}`;
    const existing = this.typingTimers.get(key);
    if (existing) clearTimeout(existing);

    this.server.to(`channel:${channelId}`).emit('typing.start', { channelId, userId });
    const timer = setTimeout(() => {
      this.typingTimers.delete(key);
      this.server.to(`channel:${channelId}`).emit('typing.stop', { channelId, userId });
    }, 7000);
    this.typingTimers.set(key, timer);
    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_stop')
  async typingStop(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const userId = client.data?.user?.sub;
    if (!userId) return { ok: false };

    const key: TypingKey = `${channelId}:${userId}`;
    const existing = this.typingTimers.get(key);
    if (existing) clearTimeout(existing);
    this.typingTimers.delete(key);

    this.server.to(`channel:${channelId}`).emit('typing.stop', { channelId, userId });
    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('voice.join')
  async voiceJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const userId = client.data?.user?.sub;
    if (!userId) return { ok: false };

    const channel = await this.ensureChannelAccess(channelId, userId);
    if (channel.type !== 'VOICE') return { ok: false };

    const room = `voice:${channelId}`;
    await client.join(room);
    this.server.to(room).emit('voice.joined', { channelId, userId });
    const sockets = await this.server.in(room).fetchSockets();
    const users = sockets.map((s) => s.data?.user?.sub).filter(Boolean);
    return { ok: true, users };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('voice.leave')
  async voiceLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const userId = client.data?.user?.sub;
    if (!userId) return { ok: false };

    await client.leave(`voice:${channelId}`);
    this.server.to(`voice:${channelId}`).emit('voice.left', { channelId, userId });
    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('voice.signal')
  async voiceSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId: string; data: any },
  ) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const userId = client.data?.user?.sub;
    if (!userId) return { ok: false };

    this.server.to(`voice:${channelId}`).emit('voice.signal', { channelId, from: userId, data: body?.data });
    return { ok: true };
  }

  emitServerUpdated(serverId: string, payload: any) {
    this.server.to(`server:${serverId}`).emit('server.updated', payload);
  }

  emitChannelCreated(serverId: string, payload: any) {
    this.server.to(`server:${serverId}`).emit('channel.created', payload);
  }

  emitChannelUpdated(serverId: string, payload: any) {
    this.server.to(`server:${serverId}`).emit('channel.updated', payload);
  }

  emitChannelDeleted(serverId: string, payload: any) {
    this.server.to(`server:${serverId}`).emit('channel.deleted', payload);
  }

  emitMessageCreated(channelId: string, payload: any) {
    this.server.to(`channel:${channelId}`).emit('message.created', payload);
  }

  emitMessageUpdated(channelId: string, payload: any) {
    this.server.to(`channel:${channelId}`).emit('message.updated', payload);
  }

  emitMessageDeleted(channelId: string, payload: any) {
    this.server.to(`channel:${channelId}`).emit('message.deleted', payload);
  }

  emitReactionAdded(channelId: string, payload: any) {
    this.server.to(`channel:${channelId}`).emit('reaction.added', payload);
  }

  emitReactionRemoved(channelId: string, payload: any) {
    this.server.to(`channel:${channelId}`).emit('reaction.removed', payload);
  }

  emitDirectMessageCreated(threadId: string, payload: any) {
    this.server.to(`direct:${threadId}`).emit('direct.message.created', payload);
  }

  emitDirectMessageUpdated(threadId: string, payload: any) {
    this.server.to(`direct:${threadId}`).emit('direct.message.updated', payload);
  }

  emitDirectMessageDeleted(threadId: string, payload: any) {
    this.server.to(`direct:${threadId}`).emit('direct.message.deleted', payload);
  }

  emitDirectReactionAdded(threadId: string, payload: any) {
    this.server.to(`direct:${threadId}`).emit('direct.reaction.added', payload);
  }

  emitDirectReactionRemoved(threadId: string, payload: any) {
    this.server.to(`direct:${threadId}`).emit('direct.reaction.removed', payload);
  }

  emitDirectThreadCreated(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('direct.thread.created', payload);
  }

  joinDirectRoomForUser(userId: string, threadId: string) {
    this.server.in(`user:${userId}`).socketsJoin(`direct:${threadId}`);
  }

  joinServerRoomForUser(userId: string, serverId: string) {
    this.server.in(`user:${userId}`).socketsJoin(`server:${serverId}`);
  }

  private extractToken(client: Socket): string | null {
    const authHeader =
      client?.handshake?.headers?.authorization ||
      client?.handshake?.auth?.token ||
      client?.handshake?.query?.token;
    const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (!raw) return null;
    return typeof raw === 'string' && raw.startsWith('Bearer ') ? raw.slice(7).trim() : String(raw);
  }

  private async ensureChannelAccess(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new Error('Channel not found');

    const member = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!member) throw new Error('Not a member');
    if (!hasAtLeastRole(member.role, channel.minRole)) throw new Error('Insufficient role');
    return channel;
  }
}
