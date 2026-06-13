import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import type { User } from '@/types/database';

type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

let initializePromise: Promise<void> | null = null;

interface AuthState {
  session: Session | null;
  authUser: AuthUser | null;
  profile: User | null;
  profileStatus: ProfileStatus;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  savePushToken: (token: string) => Promise<{ error: string | null }>;
  fetchChildrenByInvite: (inviteCode: string) => Promise<{ data: User[] | null; error: string | null }>;
  childLogin: (inviteCode: string, childId: string) => Promise<{ error: string | null }>;
  fetchProfile: () => Promise<void>;
  completeProfile: (name: string) => Promise<{ error: string | null }>;
  updateProfile: (name: string, avatarEmoji: string) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  authUser: null,
  profile: null,
  profileStatus: 'idle',
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        set({
          session,
          authUser: session?.user ?? null,
          profileStatus: session?.user ? 'loading' : 'idle',
        });

        if (session?.user) {
          await get().fetchProfile();
        }

        set({ initialized: true });

        // Listen for auth state changes once. React StrictMode and HMR can
        // otherwise register duplicate listeners that repeatedly churn auth state.
        supabase.auth.onAuthStateChange(async (_event, session) => {
          const current = get();
          const nextUser = session?.user ?? null;
          const sameSession =
            current.session?.access_token === session?.access_token &&
            current.authUser?.id === nextUser?.id;

          set({
            session,
            authUser: nextUser,
            profileStatus: session?.user
              ? sameSession ? current.profileStatus : 'loading'
              : 'idle',
          });
          if (session?.user && !sameSession) {
            await get().fetchProfile();
          } else if (!session?.user) {
            set({ profile: null, profileStatus: 'idle' });
          }
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        set({ initialized: true });
      }
    })();

    return initializePromise;
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

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'famfiapp://';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

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
    set({ session: null, authUser: null, profile: null, profileStatus: 'idle', loading: false });
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

  updatePassword: async (currentPassword: string, newPassword: string) => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        set({ loading: false });
        return { error: 'No email found for current user.' };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        set({ loading: false });
        return { error: 'Incorrect current password.' };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
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
      set({ session: null, authUser: null, profile: null, profileStatus: 'idle', loading: false });
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
    if (!authUser) {
      set({ profile: null, profileStatus: 'idle' });
      return;
    }

    set({ profileStatus: 'loading' });
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      set({ profile: data as User, profileStatus: 'ready' });
    } else if (!error && !data) {
      set({ profile: null, profileStatus: 'missing' });
    } else {
      console.error('Profile fetch error:', error);
      set({ profile: null, profileStatus: 'error' });
    }
  },

  completeProfile: async (name: string) => {
    set({ loading: true });
    try {
      const { authUser } = get();
      if (!authUser) {
        set({ loading: false });
        return { error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('users')
        .insert({
          auth_id: authUser.id,
          role: 'parent',
          name,
          avatar_emoji: '😊',
        });

      if (error) {
        set({ loading: false });
        return { error: error.message };
      }

      await get().fetchProfile();
      set({ loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: 'An unexpected error occurred.' };
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
