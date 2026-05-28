import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

const MOCK_USER: User = {
  id: "usr_001",
  name: "Elia Mwangi",
  role: "CFO",
  email: "elia@kilimanjarotrading.co.tz",
  avatar: null,
  initials: "EM",
  department: "Finance",
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => {
        set({ isLoading: true });
        await new Promise((r) => setTimeout(r, 1500));
        set({ user: MOCK_USER, isAuthenticated: true, isLoading: false });
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "ud-auth" }
  )
);
