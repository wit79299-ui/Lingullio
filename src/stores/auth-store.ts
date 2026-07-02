import { create } from 'zustand';
import type { User, LearnerProfile } from '@/types/database';

interface AppUser extends User {
  learner_profiles?: LearnerProfile[];
}

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  clear: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
