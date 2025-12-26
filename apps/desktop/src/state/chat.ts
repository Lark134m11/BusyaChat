import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { http } from '../api/http';
import { makeSocket } from '../api/ws';

type ServerSummary = {
  id: string;
  name: string;
  iconUrl?: string;
  ownerId: string;
  role: string;
};

type Channel = {
  id: string;
  serverId: string;
  name: string;
  type: string;
  minRole: string;
  position: number;
  readStates?: { lastReadMessageId?: string; lastReadAt?: string }[];
  messages?: { id: string; createdAt: string }[];
};

type Member = {
  id: string;
  role: string;
  user: { id: string; username: string; avatarUrl?: string; status?: string };
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  channelId?: string;
  threadId?: string;
  author?: { id: string; username: string; avatarUrl?: string; status?: string };
  reactions?: { id: string; emoji: string; userId: string }[];
  attachments?: { id: string; url: string; filename: string; mimeType: string; size: number }[];
};

type DirectThread = {
  id: string;
  users: { id: string; username: string; avatarUrl?: string; status?: string }[];
  lastMessage?: Message | null;
};

type Invite = {
  id: string;
  code: string;
  maxUses?: number | null;
  uses: number;
  expiresAt?: string | null;
  revoked: boolean;
};

type VoiceState = {
  channelId: string | null;
  participants: string[];
  stream: MediaStream | null;
  peers: Record<string, RTCPeerConnection>;
};

type ChatState = {
  socket: Socket | null;
  selfId: string | null;

  view: 'server' | 'direct';
  servers: ServerSummary[];
  channels: Channel[];
  members: Member[];
  messages: Message[];
  invites: Invite[];
  directThreads: DirectThread[];
  directMessages: Message[];

  activeServerId: string | null;
  activeChannelId: string | null;
  activeDirectId: string | null;

  typingUserIds: string[];
  presence: Record<string, string>;
  searchResults: Message[];
  directSearchResults: Message[];

  voice: VoiceState;

  setSelf: (userId: string) => void;
  loadServers: (accessToken: string) => Promise<void>;
  selectServer: (accessToken: string, serverId: string) => Promise<void>;
  createServer: (accessToken: string, name: string) => Promise<void>;
  renameServer: (accessToken: string, serverId: string, name: string) => Promise<void>;
  deleteServer: (accessToken: string, serverId: string) => Promise<void>;
  loadMembers: (accessToken: string, serverId: string) => Promise<void>;
  updateMemberRole: (accessToken: string, serverId: string, userId: string, role: string) => Promise<void>;
  kickMember: (accessToken: string, serverId: string, userId: string) => Promise<void>;
  banMember: (accessToken: string, serverId: string, userId: string, reason?: string) => Promise<void>;

  loadChannels: (accessToken: string, serverId: string) => Promise<void>;
  createChannel: (accessToken: string, serverId: string, name: string, minRole?: string, type?: string) => Promise<void>;
  updateChannel: (accessToken: string, channelId: string, name: string, minRole?: string) => Promise<void>;
  deleteChannel: (accessToken: string, channelId: string) => Promise<void>;

  selectChannel: (accessToken: string, channelId: string) => Promise<void>;
  sendMessage: (accessToken: string, content: string, attachments?: string[]) => Promise<void>;
  editMessage: (accessToken: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (accessToken: string, messageId: string) => Promise<void>;
  addReaction: (accessToken: string, messageId: string, emoji: string) => Promise<void>;
  removeReaction: (accessToken: string, messageId: string, emoji: string) => Promise<void>;
  markRead: (accessToken: string, channelId: string, messageId?: string) => Promise<void>;
  searchMessages: (accessToken: string, channelId: string, query: string) => Promise<void>;
  clearSearch: () => void;

  loadInvites: (accessToken: string, serverId: string) => Promise<void>;
  createInvite: (accessToken: string, serverId: string, maxUses?: number, expiresAt?: string) => Promise<Invite>;
  revokeInvite: (accessToken: string, code: string) => Promise<void>;
  joinInvite: (accessToken: string, code: string) => Promise<void>;

  loadDirectThreads: (accessToken: string) => Promise<void>;
  showDirects: () => void;
  startDirect: (accessToken: string, userId: string) => Promise<void>;
  selectDirect: (accessToken: string, threadId: string) => Promise<void>;
  sendDirect: (accessToken: string, content: string, attachments?: string[]) => Promise<void>;
  editDirect: (accessToken: string, messageId: string, content: string) => Promise<void>;
  deleteDirect: (accessToken: string, messageId: string) => Promise<void>;
  addDirectReaction: (accessToken: string, messageId: string, emoji: string) => Promise<void>;
  removeDirectReaction: (accessToken: string, messageId: string, emoji: string) => Promise<void>;
  markDirectRead: (accessToken: string, threadId: string, messageId?: string) => Promise<void>;
  searchDirectMessages: (accessToken: string, threadId: string, query: string) => Promise<void>;
  clearDirectSearch: () => void;

  upload: (accessToken: string, file: File) => Promise<any>;

  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;

  joinVoice: (channelId: string) => Promise<void>;
  leaveVoice: () => Promise<void>;

  createPeerConnection: (peerId: string, channelId: string, isInitiator: boolean) => RTCPeerConnection;

  connectWs: (accessToken: string, userId: string) => void;
  disconnectWs: () => void;
};

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export const useChat = create<ChatState>((set, get) => ({
  socket: null,
  selfId: null,

  view: 'server',
  servers: [],
  channels: [],
  members: [],
  messages: [],
  invites: [],
  directThreads: [],
  directMessages: [],

  activeServerId: null,
  activeChannelId: null,
  activeDirectId: null,

  typingUserIds: [],
  presence: {},
  searchResults: [],
  directSearchResults: [],

  voice: { channelId: null, participants: [], stream: null, peers: {} },

  setSelf: (userId) => set({ selfId: userId }),

  loadServers: async (accessToken) => {
    const servers = await http.myServers(accessToken);
    set({ servers });
    if (!get().activeServerId && servers[0]) {
      await get().selectServer(accessToken, servers[0].id);
    }
  },

  selectServer: async (accessToken, serverId) => {
    set({ view: 'server', activeServerId: serverId, activeChannelId: null, messages: [], channels: [] });
    await get().loadChannels(accessToken, serverId);
    await get().loadMembers(accessToken, serverId);
  },

  createServer: async (accessToken, name) => {
    const s = await http.createServer(accessToken, name);
    set({ servers: [s, ...get().servers] });
  },

  renameServer: async (accessToken, serverId, name) => {
    const updated = await http.renameServer(accessToken, serverId, name);
    set({ servers: get().servers.map((s) => (s.id === serverId ? { ...s, ...updated } : s)) });
  },

  deleteServer: async (accessToken, serverId) => {
    await http.deleteServer(accessToken, serverId);
    const servers = get().servers.filter((s) => s.id !== serverId);
    set({ servers, activeServerId: servers[0]?.id ?? null, activeChannelId: null });
    if (servers[0]) await get().selectServer(accessToken, servers[0].id);
  },

  loadMembers: async (accessToken, serverId) => {
    const members = await http.serverMembers(accessToken, serverId);
    set({ members });
  },

  updateMemberRole: async (accessToken, serverId, userId, role) => {
    await http.updateMemberRole(accessToken, serverId, userId, role);
    await get().loadMembers(accessToken, serverId);
  },

  kickMember: async (accessToken, serverId, userId) => {
    await http.kickMember(accessToken, serverId, userId);
    await get().loadMembers(accessToken, serverId);
  },

  banMember: async (accessToken, serverId, userId, reason) => {
    await http.banMember(accessToken, serverId, userId, reason);
    await get().loadMembers(accessToken, serverId);
  },

  loadChannels: async (accessToken, serverId) => {
    const channels = await http.channels(accessToken, serverId);
    set({ channels });
    const first = channels.find((c) => c.type === 'TEXT') ?? channels[0];
    if (first) await get().selectChannel(accessToken, first.id);
  },

  createChannel: async (accessToken, serverId, name, minRole, type) => {
    const channel = await http.createChannel(accessToken, serverId, name, minRole, type);
    set({ channels: [...get().channels, channel] });
    await get().selectChannel(accessToken, channel.id);
  },

  updateChannel: async (accessToken, channelId, name, minRole) => {
    const updated = await http.updateChannel(accessToken, channelId, name, minRole);
    set({ channels: get().channels.map((c) => (c.id === channelId ? { ...c, ...updated } : c)) });
  },

  deleteChannel: async (accessToken, channelId) => {
    await http.deleteChannel(accessToken, channelId);
    const channels = get().channels.filter((c) => c.id !== channelId);
    set({ channels, activeChannelId: channels[0]?.id ?? null, messages: [] });
    if (channels[0]) await get().selectChannel(accessToken, channels[0].id);
  },

  selectChannel: async (accessToken, channelId) => {
    const msgs = await http.messages(accessToken, channelId);
    const latestId = msgs[0]?.id;
    set({
      view: 'server',
      activeChannelId: channelId,
      messages: [...msgs].reverse(),
      typingUserIds: [],
      searchResults: [],
    });

    const socket = get().socket;
    if (socket) socket.emit('channel_join', { channelId });
    if (latestId) await get().markRead(accessToken, channelId, latestId);
  },

  sendMessage: async (accessToken, content, attachments) => {
    const channelId = get().activeChannelId;
    if (!channelId) return;
    await http.sendMessage(accessToken, channelId, content, attachments);
  },

  editMessage: async (accessToken, messageId, content) => {
    await http.editMessage(accessToken, messageId, content);
  },

  deleteMessage: async (accessToken, messageId) => {
    await http.deleteMessage(accessToken, messageId);
  },

  addReaction: async (accessToken, messageId, emoji) => {
    await http.addReaction(accessToken, messageId, emoji);
  },

  removeReaction: async (accessToken, messageId, emoji) => {
    await http.removeReaction(accessToken, messageId, emoji);
  },

  markRead: async (accessToken, channelId, messageId) => {
    await http.markRead(accessToken, channelId, messageId);
    set({
      channels: get().channels.map((c) =>
        c.id === channelId
          ? {
              ...c,
              readStates: [{ lastReadMessageId: messageId, lastReadAt: new Date().toISOString() }],
            }
          : c,
      ),
    });
  },

  searchMessages: async (accessToken, channelId, query) => {
    const results = await http.searchMessages(accessToken, channelId, query);
    set({ searchResults: results });
  },

  clearSearch: () => set({ searchResults: [] }),

  loadInvites: async (accessToken, serverId) => {
    const invites = await http.listInvites(accessToken, serverId);
    set({ invites });
  },

  createInvite: async (accessToken, serverId, maxUses, expiresAt) => {
    const invite = await http.createInvite(accessToken, serverId, maxUses, expiresAt);
    set({ invites: [invite, ...get().invites.filter((i) => i.code !== invite.code)] });
    return invite;
  },

  revokeInvite: async (accessToken, code) => {
    await http.revokeInvite(accessToken, code);
    set({ invites: get().invites.filter((i) => i.code !== code) });
  },

  joinInvite: async (accessToken, code) => {
    const server = await http.joinInvite(accessToken, code);
    set({ servers: [server, ...get().servers] });
  },

  loadDirectThreads: async (accessToken) => {
    const threads = await http.directThreads(accessToken);
    set({ directThreads: threads });
  },

  showDirects: () => {
    set({ view: 'direct', activeServerId: null, activeChannelId: null, channels: [], members: [] });
  },

  startDirect: async (accessToken, userId) => {
    const thread = await http.startDirect(accessToken, userId);
    set({ directThreads: [thread, ...get().directThreads.filter((t) => t.id !== thread.id)] });
  },

  selectDirect: async (accessToken, threadId) => {
    const msgs = await http.directMessages(accessToken, threadId);
    const latestId = msgs[0]?.id;
    set({
      view: 'direct',
      activeDirectId: threadId,
      directMessages: [...msgs].reverse(),
      typingUserIds: [],
      directSearchResults: [],
    });
    if (latestId) await get().markDirectRead(accessToken, threadId, latestId);
  },

  sendDirect: async (accessToken, content, attachments) => {
    const threadId = get().activeDirectId;
    if (!threadId) return;
    await http.directSend(accessToken, threadId, content, attachments);
  },

  editDirect: async (accessToken, messageId, content) => {
    await http.directEdit(accessToken, messageId, content);
  },

  deleteDirect: async (accessToken, messageId) => {
    await http.directDelete(accessToken, messageId);
  },

  addDirectReaction: async (accessToken, messageId, emoji) => {
    await http.directAddReaction(accessToken, messageId, emoji);
  },

  removeDirectReaction: async (accessToken, messageId, emoji) => {
    await http.directRemoveReaction(accessToken, messageId, emoji);
  },

  markDirectRead: async (accessToken, threadId, messageId) => {
    await http.directRead(accessToken, threadId, messageId);
  },

  searchDirectMessages: async (accessToken, threadId, query) => {
    const results = await http.directSearch(accessToken, threadId, query);
    set({ directSearchResults: results });
  },

  clearDirectSearch: () => set({ directSearchResults: [] }),

  upload: async (accessToken, file) => {
    return http.upload(accessToken, file);
  },

  startTyping: (channelId) => {
    const socket = get().socket;
    if (socket) socket.emit('typing_start', { channelId });
  },

  stopTyping: (channelId) => {
    const socket = get().socket;
    if (socket) socket.emit('typing_stop', { channelId });
  },

  joinVoice: async (channelId) => {
    const socket = get().socket;
    const selfId = get().selfId;
    if (!socket || !selfId) return;
    if (get().voice.channelId) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }
    const response = await new Promise<{ ok: boolean; users?: string[] }>((resolve) => {
      socket.emit('voice.join', { channelId }, (res: any) => resolve(res));
    });
    if (!response.ok) return;

    const participants = (response.users ?? []).filter((id) => id && id !== selfId);
    set({
      voice: {
        channelId,
        participants,
        stream,
        peers: {},
      },
    });

    participants.forEach((peerId) => {
      get().createPeerConnection(peerId, channelId, true);
    });
  },

  leaveVoice: async () => {
    const socket = get().socket;
    const voice = get().voice;
    if (!socket || !voice.channelId) return;

    socket.emit('voice.leave', { channelId: voice.channelId });
    Object.values(voice.peers).forEach((pc) => pc.close());
    voice.stream?.getTracks().forEach((t) => t.stop());
    set({ voice: { channelId: null, participants: [], stream: null, peers: {} } });
  },

  connectWs: (accessToken, userId) => {
    if (get().socket) return;
    const socket = makeSocket(accessToken);
    set({ socket, selfId: userId });

    socket.on('presence.update', (payload: { userId: string; status: string }) => {
      set({ presence: { ...get().presence, [payload.userId]: payload.status } });
    });

    socket.on('message.created', (msg: Message) => {
      const activeChannelId = get().activeChannelId;
      const nextChannels = get().channels.map((c) => {
        if (c.id !== msg.channelId) return c;
        const base = { ...c, messages: [{ id: msg.id, createdAt: msg.createdAt }] };
        if (c.id !== activeChannelId) return base;
        return {
          ...base,
          readStates: [{ lastReadMessageId: msg.id, lastReadAt: new Date().toISOString() }],
        };
      });

      if (msg.channelId !== activeChannelId) {
        set({ channels: nextChannels });
        return;
      }
      set({ messages: [...get().messages, msg], channels: nextChannels });
    });

    socket.on('message.updated', (msg: Message) => {
      set({ messages: get().messages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)) });
    });

    socket.on('message.deleted', (payload: { id: string }) => {
      set({ messages: get().messages.filter((m) => m.id !== payload.id) });
    });

    socket.on('reaction.added', (payload: { messageId: string; emoji: string; userId: string }) => {
      set({
        messages: get().messages.map((m) =>
          m.id === payload.messageId
            ? {
                ...m,
                reactions: [
                  ...(m.reactions ?? []),
                  { id: `${payload.messageId}-${payload.userId}-${payload.emoji}`, emoji: payload.emoji, userId: payload.userId },
                ],
              }
            : m,
        ),
      });
    });

    socket.on('reaction.removed', (payload: { messageId: string; emoji: string; userId: string }) => {
      set({
        messages: get().messages.map((m) =>
          m.id === payload.messageId
            ? {
                ...m,
                reactions: (m.reactions ?? []).filter(
                  (r) => !(r.userId === payload.userId && r.emoji === payload.emoji),
                ),
              }
            : m,
        ),
      });
    });

    socket.on('channel.created', (channel: Channel) => {
      if (channel.serverId !== get().activeServerId) return;
      set({ channels: [...get().channels, channel] });
    });

    socket.on('channel.updated', (channel: Channel) => {
      set({ channels: get().channels.map((c) => (c.id === channel.id ? { ...c, ...channel } : c)) });
    });

    socket.on('channel.deleted', (payload: { id: string }) => {
      const channels = get().channels.filter((c) => c.id !== payload.id);
      const activeChannelId = get().activeChannelId === payload.id ? channels[0]?.id ?? null : get().activeChannelId;
      set({ channels, activeChannelId });
    });

    socket.on('server.updated', (payload: any) => {
      if (payload.deleted) {
        set({ servers: get().servers.filter((s) => s.id !== payload.id) });
        return;
      }
      set({ servers: get().servers.map((s) => (s.id === payload.id ? { ...s, ...payload } : s)) });
    });

    socket.on('typing.start', (p: { channelId: string; userId: string }) => {
      if (p.channelId !== get().activeChannelId) return;
      if (!get().typingUserIds.includes(p.userId)) {
        set({ typingUserIds: [...get().typingUserIds, p.userId] });
      }
    });

    socket.on('typing.stop', (p: { channelId: string; userId: string }) => {
      if (p.channelId !== get().activeChannelId) return;
      set({ typingUserIds: get().typingUserIds.filter((x) => x !== p.userId) });
    });

    socket.on('direct.thread.created', (thread: DirectThread) => {
      set({ directThreads: [thread, ...get().directThreads.filter((t) => t.id !== thread.id)] });
    });

    socket.on('direct.message.created', (msg: Message) => {
      if (msg.threadId === get().activeDirectId) {
        set({ directMessages: [...get().directMessages, msg] });
      }
      set({
        directThreads: get().directThreads.map((t) =>
          t.id === msg.threadId ? { ...t, lastMessage: msg } : t,
        ),
      });
    });

    socket.on('direct.message.updated', (msg: Message) => {
      set({ directMessages: get().directMessages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)) });
    });

    socket.on('direct.message.deleted', (payload: { id: string }) => {
      set({ directMessages: get().directMessages.filter((m) => m.id !== payload.id) });
    });

    socket.on('direct.reaction.added', (payload: { directMessageId: string; emoji: string; userId: string }) => {
      set({
        directMessages: get().directMessages.map((m) =>
          m.id === payload.directMessageId
            ? {
                ...m,
                reactions: [
                  ...(m.reactions ?? []),
                  {
                    id: `${payload.directMessageId}-${payload.userId}-${payload.emoji}`,
                    emoji: payload.emoji,
                    userId: payload.userId,
                  },
                ],
              }
            : m,
        ),
      });
    });

    socket.on('direct.reaction.removed', (payload: { directMessageId: string; emoji: string; userId: string }) => {
      set({
        directMessages: get().directMessages.map((m) =>
          m.id === payload.directMessageId
            ? {
                ...m,
                reactions: (m.reactions ?? []).filter(
                  (r) => !(r.userId === payload.userId && r.emoji === payload.emoji),
                ),
              }
            : m,
        ),
      });
    });

    socket.on('voice.joined', (payload: { channelId: string; userId: string }) => {
      const voice = get().voice;
      if (voice.channelId !== payload.channelId) return;
      if (payload.userId === get().selfId) return;
      if (!voice.participants.includes(payload.userId)) {
        set({ voice: { ...voice, participants: [...voice.participants, payload.userId] } });
      }
      get().createPeerConnection(payload.userId, payload.channelId, true);
    });

    socket.on('voice.left', (payload: { channelId: string; userId: string }) => {
      const voice = get().voice;
      if (voice.channelId !== payload.channelId) return;
      const peer = voice.peers[payload.userId];
      if (peer) peer.close();
      const nextPeers = { ...voice.peers };
      delete nextPeers[payload.userId];
      set({
        voice: {
          ...voice,
          peers: nextPeers,
          participants: voice.participants.filter((id) => id !== payload.userId),
        },
      });
    });

    socket.on('voice.signal', async (payload: { channelId: string; from: string; data: any }) => {
      const voice = get().voice;
      if (voice.channelId !== payload.channelId) return;
      if (payload.from === get().selfId) return;

      const data = payload.data || {};
      if (data.to && data.to !== get().selfId) return;

      const pc = get().createPeerConnection(payload.from, payload.channelId, false);
      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice.signal', {
          channelId: payload.channelId,
          data: { type: 'answer', sdp: pc.localDescription, to: payload.from },
        });
      } else if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'ice' && data.candidate) {
        await pc.addIceCandidate(data.candidate);
      }
    });

    set({ socket });
  },

  disconnectWs: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    const voice = get().voice;
    Object.values(voice.peers).forEach((pc) => pc.close());
    voice.stream?.getTracks().forEach((t) => t.stop());
    set({ socket: null, typingUserIds: [], presence: {}, voice: { channelId: null, participants: [], stream: null, peers: {} } });
  },

  createPeerConnection: (peerId: string, channelId: string, isInitiator: boolean) => {
    const voice = get().voice;
    if (voice.peers[peerId]) return voice.peers[peerId];
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    voice.stream?.getTracks().forEach((track) => pc.addTrack(track, voice.stream as MediaStream));

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      get().socket?.emit('voice.signal', {
        channelId,
        data: { type: 'ice', candidate: event.candidate, to: peerId },
      });
    };

    pc.ontrack = (event) => {
      const audio = document.getElementById(`voice-audio-${peerId}`) as HTMLAudioElement | null;
      if (audio) {
        audio.srcObject = event.streams[0];
        audio.play().catch(() => undefined);
      }
    };

    const peers = { ...voice.peers, [peerId]: pc };
    set({ voice: { ...voice, peers } });

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          get().socket?.emit('voice.signal', {
            channelId,
            data: { type: 'offer', sdp: pc.localDescription, to: peerId },
          });
        })
        .catch(() => undefined);
    }

    return pc;
  },
}));
