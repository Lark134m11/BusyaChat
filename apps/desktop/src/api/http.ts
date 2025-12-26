const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type Tokens = { accessToken: string; refreshToken: string };

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

export const http = {
  async register(email: string, password: string, username: string) {
    const res = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });
    return json<any>(res);
  },

  async login(email: string, password: string) {
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return json<any>(res);
  },

  async refresh(refreshToken: string) {
    const res = await fetch(`${BACKEND}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return json<Tokens>(res);
  },

  async me(accessToken: string) {
    const res = await fetch(`${BACKEND}/auth/me`, {
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async logout(accessToken: string) {
    const res = await fetch(`${BACKEND}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async searchUsers(accessToken: string, query: string) {
    const res = await fetch(`${BACKEND}/users/search?query=${encodeURIComponent(query)}`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async myServers(accessToken: string) {
    const res = await fetch(`${BACKEND}/servers/@me`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async createServer(accessToken: string, name: string, iconUrl?: string) {
    const res = await fetch(`${BACKEND}/servers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ name, iconUrl }),
    });
    return json<any>(res);
  },

  async renameServer(accessToken: string, serverId: string, name: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ name }),
    });
    return json<any>(res);
  },

  async deleteServer(accessToken: string, serverId: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async serverMembers(accessToken: string, serverId: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/members`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async updateMemberRole(accessToken: string, serverId: string, userId: string, role: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/members/${userId}/role`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ role }),
    });
    return json<any>(res);
  },

  async kickMember(accessToken: string, serverId: string, userId: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/members/${userId}/kick`, {
      method: 'POST',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async banMember(accessToken: string, serverId: string, userId: string, reason?: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/members/${userId}/ban`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ reason }),
    });
    return json<any>(res);
  },

  async channels(accessToken: string, serverId: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/channels`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async createChannel(accessToken: string, serverId: string, name: string, minRole?: string, type?: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/channels`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ name, minRole, type }),
    });
    return json<any>(res);
  },

  async updateChannel(accessToken: string, channelId: string, name: string, minRole?: string) {
    const res = await fetch(`${BACKEND}/channels/${channelId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ name, minRole }),
    });
    return json<any>(res);
  },

  async deleteChannel(accessToken: string, channelId: string) {
    const res = await fetch(`${BACKEND}/channels/${channelId}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async messages(accessToken: string, channelId: string, cursor?: string, limit = 50) {
    const query = new URLSearchParams();
    if (cursor) query.set('cursor', cursor);
    query.set('limit', String(limit));
    const res = await fetch(`${BACKEND}/channels/${channelId}/messages?${query.toString()}`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async searchMessages(accessToken: string, channelId: string, query: string, limit = 20) {
    const qs = new URLSearchParams({ query, limit: String(limit) });
    const res = await fetch(`${BACKEND}/channels/${channelId}/messages/search?${qs.toString()}`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async sendMessage(accessToken: string, channelId: string, content: string, attachmentIds?: string[]) {
    const res = await fetch(`${BACKEND}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ content, attachmentIds }),
    });
    return json<any>(res);
  },

  async editMessage(accessToken: string, messageId: string, content: string) {
    const res = await fetch(`${BACKEND}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ content }),
    });
    return json<any>(res);
  },

  async deleteMessage(accessToken: string, messageId: string) {
    const res = await fetch(`${BACKEND}/messages/${messageId}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async addReaction(accessToken: string, messageId: string, emoji: string) {
    const res = await fetch(`${BACKEND}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ emoji }),
    });
    return json<any>(res);
  },

  async removeReaction(accessToken: string, messageId: string, emoji: string) {
    const res = await fetch(`${BACKEND}/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ emoji }),
    });
    return json<any>(res);
  },

  async markRead(accessToken: string, channelId: string, messageId?: string) {
    const res = await fetch(`${BACKEND}/channels/${channelId}/messages/read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ messageId }),
    });
    return json<any>(res);
  },

  async createInvite(accessToken: string, serverId: string, maxUses?: number, expiresAt?: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ maxUses, expiresAt }),
    });
    return json<any>(res);
  },

  async listInvites(accessToken: string, serverId: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/invites`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async revokeInvite(accessToken: string, code: string) {
    const res = await fetch(`${BACKEND}/invites/${code}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async joinInvite(accessToken: string, code: string) {
    const res = await fetch(`${BACKEND}/invites/${code}/join`, {
      method: 'POST',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async directThreads(accessToken: string) {
    const res = await fetch(`${BACKEND}/direct`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async startDirect(accessToken: string, userId: string) {
    const res = await fetch(`${BACKEND}/direct/${userId}`, {
      method: 'POST',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async directMessages(accessToken: string, threadId: string, cursor?: string, limit = 50) {
    const query = new URLSearchParams();
    if (cursor) query.set('cursor', cursor);
    query.set('limit', String(limit));
    const res = await fetch(`${BACKEND}/direct/${threadId}/messages?${query.toString()}`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async directSearch(accessToken: string, threadId: string, query: string, limit = 20) {
    const qs = new URLSearchParams({ query, limit: String(limit) });
    const res = await fetch(`${BACKEND}/direct/${threadId}/messages/search?${qs.toString()}`, {
      headers: authHeaders(accessToken),
    });
    return json<any[]>(res);
  },

  async directSend(accessToken: string, threadId: string, content: string, attachmentIds?: string[]) {
    const res = await fetch(`${BACKEND}/direct/${threadId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ content, attachmentIds }),
    });
    return json<any>(res);
  },

  async directEdit(accessToken: string, messageId: string, content: string) {
    const res = await fetch(`${BACKEND}/direct/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ content }),
    });
    return json<any>(res);
  },

  async directDelete(accessToken: string, messageId: string) {
    const res = await fetch(`${BACKEND}/direct/messages/${messageId}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    });
    return json<any>(res);
  },

  async directAddReaction(accessToken: string, messageId: string, emoji: string) {
    const res = await fetch(`${BACKEND}/direct/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ emoji }),
    });
    return json<any>(res);
  },

  async directRemoveReaction(accessToken: string, messageId: string, emoji: string) {
    const res = await fetch(`${BACKEND}/direct/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ emoji }),
    });
    return json<any>(res);
  },

  async directRead(accessToken: string, threadId: string, messageId?: string) {
    const res = await fetch(`${BACKEND}/direct/${threadId}/read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify({ messageId }),
    });
    return json<any>(res);
  },

  async upload(accessToken: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BACKEND}/uploads`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: form,
    });
    return json<any>(res);
  },
};
