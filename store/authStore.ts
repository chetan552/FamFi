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
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  savePushToken: (token: string) => Promise<{ error: string | null }>;
  fetchChildrenByInvite: (inviteCode: string) => Promise<{ data: User[] | null; error: string | null }>;
  childLogin: (inviteCode: string, childId: string) => Promise<{ error: string | null }>;
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

  resetPassword: async (email: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
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

  updatePassword: async (password: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.updateUser({ password });
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

  deleteAccount: async () => {
    set({ loading: true });
    try {
      // Call the RPC defined in the database migration
      const { error } = await supabase.rpc('delete_user');
      
      if (error) {
        set({ loading: false });
        return { error: error.message };
      }
      
      // Wipe local auth state
      await supabase.auth.signOut();
      set({ session: null, authUser: null, profile: null, loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: 'An unexpected error occurred.' };
    }
  },

  savePushToken: async (token: string) => {
    const { authUser, profile } = get();
    if (!authUser || !profile) return { error: 'Not authenticated' };
    
    // Prevent redundant network requests if it's already saved locally
    if ((profile as any).expo_push_token === token) return { error: null };

    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token } as any)
      .eq('id', profile.id);

    if (!error) {
      set({ profile: { ...profile, expo_push_token: token } as any });
      return { error: null };
    }
    return { error: error.message };
  },

  fetchChildrenByInvite: async (inviteCode: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('get_children_by_invite', {
        p_invite_code: inviteCode
      });
      if (error) {
        set({ loading: false });
        return { data: null, error: error.message };
      }
      set({ loading: false });
      return { data: data as User[], error: null };
    } catch (error) {
      set({ loading: false });
      return { data: null, error: 'An unexpected error occurred.' };
    }
  },

  childLogin: async (inviteCode: string, childId: string) => {
    set({ loading: true });
    try {
      // 1. Sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !authData.user) {
        set({ loading: false });
        return { error: authError?.message || 'Failed to authenticate.' };
      }

      // 2. Link the new anonymous session to the chosen child profile
      const { error: rpcError } = await supabase.rpc('link_child_account', {
        p_invite_code: inviteCode,
        p_child_id: childId
      });

      if (rpcError) {
        // Rollback anonymous session if linking failed
        await supabase.auth.signOut();
        set({ loading: false });
        // The PGRST errors are cryptic, maybe abstract it slightly
        if (rpcError.message.includes('already linked')) {
          return { error: 'Child account not found or cannot be linked.' };
        }
        return { error: rpcError.message };
      }

      // 3. Fetch the linked profile
      await get().fetchProfile();
      
      set({ loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: 'An unexpected error occurred.' };
    }
  },

  fetchProfile: async () => {
    const { authUser } = get();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle();

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
