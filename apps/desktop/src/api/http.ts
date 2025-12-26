const BACKEND = 'http://localhost:4000';

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

export const http = {
  async register(email: string, password: string, nickname?: string) {
    const res = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, nickname }),
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
    const res = await fetch(`${BACKEND}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return json<any>(res);
  },

  async myServers(accessToken: string) {
    const res = await fetch(`${BACKEND}/servers/@me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return json<any[]>(res);
  },

  async createServer(accessToken: string, name: string) {
    const res = await fetch(`${BACKEND}/servers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name }),
    });
    return json<any>(res);
  },

  async channels(accessToken: string, serverId: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/channels`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return json<any[]>(res);
  },

  async createChannel(accessToken: string, serverId: string, name: string) {
    const res = await fetch(`${BACKEND}/servers/${serverId}/channels`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name }),
    });
    return json<any>(res);
  },

  async messages(accessToken: string, channelId: string) {
    const res = await fetch(`${BACKEND}/channels/${channelId}/messages?limit=50`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return json<any[]>(res);
  },

  async sendMessage(accessToken: string, channelId: string, content: string) {
    const res = await fetch(`${BACKEND}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ content }),
    });
    return json<any>(res);
  },
};
