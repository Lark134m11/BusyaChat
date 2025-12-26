import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

export function makeSocket(accessToken: string): Socket {
  return io(WS_URL, {
    transports: ['websocket'],
    auth: { token: accessToken },
  });
}
