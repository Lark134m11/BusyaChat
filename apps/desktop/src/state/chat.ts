import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { http } from '../api/http';
import { makeSocket } from '../api/ws';

type ChatState = {
  socket: Socket | null;

  servers: any[];
  channels: any[];
  messages: any[];

  activeServerId: string | null;
  activeChannelId: string | null;

  typingUserIds: string[];

  loadServers: (accessToken: string) => Promise<void>;
  createServer: (accessToken: string, name: string) => Promise<void>;

  selectServer: (accessToken: string, serverId: string) => Promise<void>;
  selectChannel: (accessToken: string, channelId: string) => Promise<void>;

  send: (accessToken: string, content: string) => Promise<void>;

  connectWs: (accessToken: string) => void;
  disconnectWs: () => void;
};

export const useChat = create<ChatState>((set, get) => ({
  socket: null,

  servers: [],
  channels: [],
  messages: [],

  activeServerId: null,
  activeChannelId: null,

  typingUserIds: [],

  loadServers: async (accessToken) => {
    const servers = await http.myServers(accessToken);
    set({ servers });
    if (!get().activeServerId && servers[0]) {
      await get().selectServer(accessToken, servers[0].id);
    }
  },

  createServer: async (accessToken, name) => {
    const s = await http.createServer(accessToken, name);
    set({ servers: [s, ...get().servers] });
  },

  selectServer: async (accessToken, serverId) => {
    const channels = await http.channels(accessToken, serverId);
    set({ activeServerId: serverId, channels, messages: [], activeChannelId: null });
    if (channels[0]) {
      await get().selectChannel(accessToken, channels[0].id);
    }
  },

  selectChannel: async (accessToken, channelId) => {
    const msgs = await http.messages(accessToken, channelId);
    set({ activeChannelId: channelId, messages: msgs.reverse(), typingUserIds: [] });

    const s = get().socket;
    if (s) s.emit('channel_join', { channelId });
  },

  send: async (accessToken, content) => {
    const channelId = get().activeChannelId;
    if (!channelId) return;
    await http.sendMessage(accessToken, channelId, content);
  },

  connectWs: (accessToken) => {
    const existing = get().socket;
    if (existing) return;

    const socket = makeSocket(accessToken);

    socket.on('hello', () => {});

    socket.on('message_created', (msg: any) => {
      const { activeChannelId } = get();
      if (msg.channelId !== activeChannelId) return;
      set({ messages: [...get().messages, msg] });
    });

    socket.on('typing_started', (p: { channelId: string; userId: string }) => {
      if (p.channelId !== get().activeChannelId) return;
      if (!get().typingUserIds.includes(p.userId)) set({ typingUserIds: [...get().typingUserIds, p.userId] });
    });

    socket.on('typing_stopped', (p: { channelId: string; userId: string }) => {
      if (p.channelId !== get().activeChannelId) return;
      set({ typingUserIds: get().typingUserIds.filter((x) => x !== p.userId) });
    });

    set({ socket });
  },

  disconnectWs: () => {
    const s = get().socket;
    if (s) s.disconnect();
    set({ socket: null, typingUserIds: [] });
  },
}));
