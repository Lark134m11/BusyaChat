import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../common/auth/ws-jwt.guard';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // user payload will be injected by guard when events are handled,
    // but connection is allowed; we’ll validate on join events.
    client.emit('hello', { ok: true, msg: 'busya ws hello 🐾' });
  }

  handleDisconnect(_: Socket) {
    // noop
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('channel_join')
  async channelJoin(@ConnectedSocket() client: any, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    await client.join(`channel:${channelId}`);
    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_start')
  async typingStart(@ConnectedSocket() client: any, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const user = client.user;
    client.to(`channel:${channelId}`).emit('typing_started', { channelId, userId: user.sub });
    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_stop')
  async typingStop(@ConnectedSocket() client: any, @MessageBody() body: { channelId: string }) {
    const channelId = String(body?.channelId ?? '');
    if (!channelId) return { ok: false };

    const user = client.user;
    client.to(`channel:${channelId}`).emit('typing_stopped', { channelId, userId: user.sub });
    return { ok: true };
  }

  emitMessageCreated(channelId: string, message: any) {
    this.server.to(`channel:${channelId}`).emit('message_created', message);
  }
}
