import { create } from "zustand";
import { AuthUser } from "./types";
import { clearAuth, getToken, getUser } from "../../lib/auth-storage";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isBootstrapping: boolean;
  hydrate: () => Promise<void>;
  setSession: (params: { user: AuthUser; token: string }) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isBootstrapping: true,
  hydrate: async () => {
    const [token, user] = await Promise.all([getToken(), getUser()]);
    set({ token, user, isBootstrapping: false });
  },
  setSession: ({ user, token }) => set({ user, token }),
  logout: async () => {
    await clearAuth();
    set({ user: null, token: null });
  }
}));

void useAuthStore.getState().hydrate();
