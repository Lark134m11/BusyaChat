import { create } from 'zustand';
import { http } from '../api/http';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  me: any | null;
  error: string | null;
  loading: boolean;

  setTokens: (a: string, r: string) => void;
  logout: () => Promise<void>;
  initMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem('busya_access'),
  refreshToken: localStorage.getItem('busya_refresh'),
  me: null,
  error: null,
  loading: false,

  setTokens: (a, r) => {
    localStorage.setItem('busya_access', a);
    localStorage.setItem('busya_refresh', r);
    set({ accessToken: a, refreshToken: r });
  },

  logout: async () => {
    const { accessToken } = get();
    if (accessToken) {
      try {
        await http.logout(accessToken);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('busya_access');
    localStorage.removeItem('busya_refresh');
    set({ accessToken: null, refreshToken: null, me: null });
  },

  initMe: async () => {
    const { accessToken, refreshToken } = get();
    if (!accessToken || !refreshToken) return;

    set({ loading: true, error: null });
    try {
      const me = await http.me(accessToken);
      set({ me, loading: false });
    } catch (e: any) {
      // try refresh
      try {
        const t = await http.refresh(refreshToken);
        get().setTokens(t.accessToken, t.refreshToken);
        const me = await http.me(t.accessToken);
        set({ me, loading: false });
      } catch (e2: any) {
        set({ loading: false, error: e2?.message ?? 'auth failed' });
        get().logout();
      }
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const r = await http.login(email, password);
      get().setTokens(r.accessToken, r.refreshToken);
      set({ me: r.user, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'login failed' });
    }
  },

  register: async (email, password, username) => {
    set({ loading: true, error: null });
    try {
      const r = await http.register(email, password, username);
      get().setTokens(r.accessToken, r.refreshToken);
      set({ me: r.user, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'register failed' });
    }
  },
}));
