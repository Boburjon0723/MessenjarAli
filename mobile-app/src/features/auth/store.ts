import { create } from "zustand";
import { AuthUser } from "./types";
import { clearChatCacheForUser } from "../../lib/app-cache";
import { clearAuth, getToken, getUser, saveUser } from "../../lib/auth-storage";
import { connectSocket, disconnectSocket } from "../../lib/socket";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isBootstrapping: boolean;
  hydrate: () => Promise<void>;
  setSession: (params: { user: AuthUser; token: string }) => void;
  /** Profil / avatar yangilanishi — zustand + SecureStore */
  patchUser: (partial: Partial<AuthUser>) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isBootstrapping: true,
  hydrate: async () => {
    const [token, user] = await Promise.all([getToken(), getUser()]);
    set({ token, user, isBootstrapping: false });
    if (token) connectSocket();
  },
  setSession: ({ user, token }) => {
    set({ user, token });
    connectSocket();
  },
  patchUser: async (partial) => {
    const prev = useAuthStore.getState().user;
    const next = { ...(prev || {}), ...partial } as AuthUser;
    set({ user: next });
    await saveUser(next);
  },
  logout: async () => {
    const u = useAuthStore.getState().user as { id?: string; _id?: string } | null;
    const uid = u?.id ?? u?._id;
    if (uid) {
      await clearChatCacheForUser(String(uid));
    }
    await clearAuth();
    disconnectSocket();
    set({ user: null, token: null });
  }
}));

void useAuthStore.getState().hydrate();

export { getToken };

