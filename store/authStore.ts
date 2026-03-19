import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import type { User } from '@/types/database';

interface AuthState {
  session: Session | null;
  authUser: AuthUser | null;
  profile: User | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (name: string, avatarEmoji: string) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  authUser: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        authUser: session?.user ?? null,
        initialized: true,
      });

      if (session?.user) {
        await get().fetchProfile();
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session, authUser: session?.user ?? null });
        if (session?.user) {
          await get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ initialized: true });
    }
  },

  signUp: async (email: string, password: string, name: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        set({ loading: false });
        return { error: error.message };
      }

      if (data.user) {
        // Create the user profile row as a parent
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_id: data.user.id,
            role: 'parent',
            name,
            avatar_emoji: '😊',
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          set({ loading: false });
          return { error: 'Account created but profile setup failed. Please try logging in.' };
        }

        await get().fetchProfile();
      }

      set({ loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: 'An unexpected error occurred.' };
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        set({ loading: false });
        return { error: error.message };
      }

      set({ loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: 'An unexpected error occurred.' };
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ session: null, authUser: null, profile: null, loading: false });
  },

  fetchProfile: async () => {
    const { authUser } = get();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();

    if (!error && data) {
      set({ profile: data as User });
    }
  },

  updateProfile: async (name: string, avatarEmoji: string) => {
    set({ loading: true });
    const { profile } = get();
    if (!profile) { set({ loading: false }); return { error: 'Not authenticated' }; }

    const { error } = await supabase
      .from('users')
      .update({ name, avatar_emoji: avatarEmoji })
      .eq('id', profile.id);

    if (error) { set({ loading: false }); return { error: error.message }; }

    set({ profile: { ...profile, name, avatar_emoji: avatarEmoji }, loading: false });
    return { error: null };
  },
}));
