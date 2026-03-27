import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Family, User, BucketTemplate, Chore, ChoreStatus, Bucket, Transaction, InterestSetting, GoogleTaskMapping } from '@/types/database';
import { generateInviteCode } from '@/lib/utils';
import { syncTasksForFamily } from '@/lib/googleTasksSync';

// Helper to reliably get/create a bucket for the current month
async function getOrCreateBucket(childId: string, templateId: string): Promise<string> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data } = await supabase
    .from('buckets')
    .select('id')
    .eq('child_id', childId)
    .eq('template_id', templateId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (data) return data.id;

  const { data: newData, error } = await supabase
    .from('buckets')
    .insert({ child_id: childId, template_id: templateId, month, year })
    .select('id')
    .single();

  if (error) throw error;
  return newData.id;
}

interface FamilyState {
  family: Family | null;
  children: User[];
  members: User[];
  bucketTemplates: BucketTemplate[];
  chores: Chore[];
  buckets: Bucket[];
  allFamilyBuckets: Bucket[];
  transactions: Transaction[];
  allTransactions: Transaction[];
  interestSettings: InterestSetting[];
  googleMappings: GoogleTaskMapping[];
  googleConnected: boolean;
  loading: boolean;

  fetchFamily: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  createFamily: (name: string) => Promise<{ error: string | null }>;
  joinFamily: (inviteCode: string) => Promise<{ error: string | null }>;
  updateFamily: (name: string) => Promise<{ error: string | null }>;
  regenerateInviteCode: () => Promise<{ error: string | null }>;
  fetchChildren: () => Promise<void>;
  addChild: (name: string, avatarEmoji: string) => Promise<{ error: string | null }>;
  updateChild: (childId: string, name: string, avatarEmoji: string) => Promise<{ error: string | null }>;
  removeChild: (childId: string) => Promise<{ error: string | null }>;
  fetchBucketTemplates: () => Promise<void>;
  createBucketTemplate: (name: string, emoji: string, color: string) => Promise<{ error: string | null }>;
  updateBucketTemplate: (id: string, updates: Partial<Pick<BucketTemplate, 'name' | 'emoji' | 'color' | 'sort_order' | 'is_active'>>) => Promise<{ error: string | null }>;
  deleteBucketTemplate: (id: string) => Promise<{ error: string | null }>;

  fetchChores: () => Promise<void>;
  createChore: (childId: string, title: string, value: number, dueDate: string | null, isRecurring?: boolean, recurrencePeriod?: string | null) => Promise<{ error: string | null }>;
  updateChore: (id: string, updates: { title?: string; value?: number; due_date?: string | null; assigned_to_child_id?: string; is_recurring?: boolean; recurrence_period?: string | null }) => Promise<{ error: string | null }>;
  updateChoreStatus: (id: string, status: ChoreStatus) => Promise<{ error: string | null }>;
  deleteChore: (id: string) => Promise<{ error: string | null }>;

  fetchChildBuckets: (childId: string) => Promise<void>;
  fetchAllFamilyBuckets: () => Promise<void>;
  fetchChildTransactions: (childId: string) => Promise<void>;
  fetchAllFamilyTransactions: () => Promise<void>;
  markChoreDone: (id: string) => Promise<{ error: string | null }>;

  addGift: (childId: string, templateId: string, amount: number, description: string) => Promise<{ error: string | null }>;
  withdrawFromBucket: (childId: string, templateId: string, amount: number, description: string) => Promise<{ error: string | null }>;
  processPayday: (childId: string, templateDistributions: Record<string, number>, choreIds: string[]) => Promise<{ error: string | null }>;

  fetchInterestSettings: () => Promise<void>;
  saveInterestSetting: (templateId: string, ratePercent: number, matchEnabled: boolean) => Promise<{ error: string | null }>;
  processInterest: () => Promise<{ error: string | null; processed: number }>;

  // Google Tasks
  checkGoogleConnection: () => Promise<void>;
  fetchGoogleMappings: () => Promise<void>;
  saveGoogleMapping: (googleTasklistId: string, googleTasklistTitle: string, childId: string, defaultReward: number) => Promise<{ error: string | null }>;
  deleteGoogleMapping: (id: string) => Promise<{ error: string | null }>;
  saveGoogleTokens: (accessToken: string, refreshToken: string | undefined, expiresIn: number) => Promise<{ error: string | null }>;
  disconnectGoogle: () => Promise<{ error: string | null }>;
  syncGoogleTasks: () => Promise<{ synced: number; errors: string[] }>;

  reset: () => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  children: [],
  members: [],
  bucketTemplates: [],
  chores: [],
  buckets: [],
  allFamilyBuckets: [],
  transactions: [],
  allTransactions: [],
  interestSettings: [],
  googleMappings: [],
  googleConnected: false,
  loading: false,

  fetchFamily: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) return;

    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', profile.family_id)
      .single();

    if (!error && data) {
      set({ family: data as Family });
      await Promise.all([
        get().fetchMembers(),
        get().fetchChildren(),
        get().fetchBucketTemplates(),
        get().fetchChores(),
      ]);
    }
  },

  fetchMembers: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('family_id', profile.family_id)
      .eq('role', 'parent')
      .order('created_at', { ascending: true });

    if (!error && data) {
      set({ members: data as User[] });
    }
  },

  createFamily: async (name: string) => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile) {
      set({ loading: false });
      return { error: 'Not authenticated' };
    }

    const invite_code = generateInviteCode();

    const { data, error } = await supabase
      .from('families')
      .insert({ name, invite_code, created_by: profile.auth_id })
      .select()
      .single();

    if (error) {
      set({ loading: false });
      return { error: error.message };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ family_id: (data as Family).id })
      .eq('id', profile.id);

    if (updateError) {
      set({ loading: false });
      return { error: 'Family created but failed to link your profile.' };
    }

    set({ family: data as Family, loading: false });
    await useAuthStore.getState().fetchProfile();
    return { error: null };
  },

  joinFamily: async (inviteCode: string) => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile) {
      set({ loading: false });
      return { error: 'Not authenticated' };
    }

    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('id')
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle();

    if (familyError) { set({ loading: false }); return { error: familyError.message }; }
    if (!familyData) { set({ loading: false }); return { error: 'Invalid invite code. Please check and try again.' }; }

    const { error: updateError } = await supabase
      .from('users')
      .update({ family_id: familyData.id })
      .eq('id', profile.id);

    if (updateError) { set({ loading: false }); return { error: 'Found family but failed to join. Please try again.' }; }

    await useAuthStore.getState().fetchProfile();
    await get().fetchFamily();
    await get().fetchMembers();
    await get().fetchChildren();
    await get().fetchBucketTemplates();
    await get().fetchChores();

    set({ loading: false });
    return { error: null };
  },

  updateFamily: async (name: string) => {
    set({ loading: true });
    const { family } = get();
    if (!family) { set({ loading: false }); return { error: 'No family found.' }; }

    const { error } = await supabase
      .from('families')
      .update({ name })
      .eq('id', family.id);

    if (error) { set({ loading: false }); return { error: error.message }; }

    set({ family: { ...family, name }, loading: false });
    return { error: null };
  },

  regenerateInviteCode: async () => {
    set({ loading: true });
    const { family } = get();
    if (!family) { set({ loading: false }); return { error: 'No family found.' }; }

    const invite_code = generateInviteCode();
    const { error } = await supabase
      .from('families')
      .update({ invite_code })
      .eq('id', family.id);

    if (error) { set({ loading: false }); return { error: error.message }; }

    set({ family: { ...family, invite_code }, loading: false });
    return { error: null };
  },

  fetchChildren: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('family_id', profile.family_id)
      .eq('role', 'child')
      .order('created_at', { ascending: true });

    if (!error && data) {
      set({ children: data as User[] });
    }
  },

  addChild: async (name: string, avatarEmoji: string) => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) { set({ loading: false }); return { error: 'No family set up yet.' }; }

    const { error } = await supabase
      .from('users')
      .insert({ family_id: profile.family_id, role: 'child', name, avatar_emoji: avatarEmoji, auth_id: null });

    if (error) { set({ loading: false }); return { error: error.message }; }

    await get().fetchChildren();
    set({ loading: false });
    return { error: null };
  },

  updateChild: async (childId: string, name: string, avatarEmoji: string) => {
    set({ loading: true });
    const { error } = await supabase
      .from('users')
      .update({ name, avatar_emoji: avatarEmoji })
      .eq('id', childId);

    if (error) { set({ loading: false }); return { error: error.message }; }

    await get().fetchChildren();
    set({ loading: false });
    return { error: null };
  },

  removeChild: async (childId: string) => {
    set({ loading: true });
    const { error } = await supabase.from('users').delete().eq('id', childId);
    if (error) { set({ loading: false }); return { error: error.message }; }
    await get().fetchChildren();
    set({ loading: false });
    return { error: null };
  },

  fetchBucketTemplates: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) return;

    const { data, error } = await supabase
      .from('bucket_templates')
      .select('*')
      .eq('family_id', profile.family_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      set({ bucketTemplates: data as BucketTemplate[] });
    }
  },

  createBucketTemplate: async (name: string, emoji: string, color: string) => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) { set({ loading: false }); return { error: 'No family set up yet.' }; }

    const { bucketTemplates } = get();

    const { error } = await supabase
      .from('bucket_templates')
      .insert({ family_id: profile.family_id, name, emoji, color, sort_order: bucketTemplates.length, is_active: true });

    if (error) { set({ loading: false }); return { error: error.message }; }

    await get().fetchBucketTemplates();
    set({ loading: false });
    return { error: null };
  },

  updateBucketTemplate: async (id: string, updates) => {
    set({ loading: true });
    const { error } = await supabase.from('bucket_templates').update(updates).eq('id', id);
    if (error) { set({ loading: false }); return { error: error.message }; }
    await get().fetchBucketTemplates();
    set({ loading: false });
    return { error: null };
  },

  deleteBucketTemplate: async (id: string) => {
    return get().updateBucketTemplate(id, { is_active: false });
  },

  fetchChores: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) return;

    const { data, error } = await supabase
      .from('chores')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ chores: data as Chore[] });
    }
  },

  createChore: async (childId: string, title: string, value: number, dueDate: string | null, isRecurring: boolean = false, recurrencePeriod: string | null = null) => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) { set({ loading: false }); return { error: 'No family set up yet.' }; }

    const { error } = await supabase
      .from('chores')
      .insert({
        family_id: profile.family_id,
        assigned_to_child_id: childId,
        title,
        value,
        due_date: dueDate,
        status: 'assigned',
        is_recurring: isRecurring,
        recurrence_period: isRecurring ? recurrencePeriod : null,
      });

    if (error) { set({ loading: false }); return { error: error.message }; }

    await get().fetchChores();
    set({ loading: false });
    return { error: null };
  },

  updateChore: async (id: string, updates) => {
    set({ loading: true });
    const { error } = await supabase.from('chores').update(updates).eq('id', id);
    if (error) { set({ loading: false }); return { error: error.message }; }
    await get().fetchChores();
    set({ loading: false });
    return { error: null };
  },

  updateChoreStatus: async (id: string, status: ChoreStatus) => {
    set({ loading: true });
    const { error } = await supabase.from('chores').update({ status }).eq('id', id);
    if (error) { set({ loading: false }); return { error: error.message }; }

    // Auto-clone recurring chores when approved
    if (status === 'approved') {
      const chore = get().chores.find(c => c.id === id);
      if (chore?.is_recurring && chore.recurrence_period) {
        // Calculate next due date
        let nextDueDate: string | null = null;
        if (chore.due_date) {
          const d = new Date(chore.due_date);
          if (chore.recurrence_period === 'daily') d.setDate(d.getDate() + 1);
          else if (chore.recurrence_period === 'weekly') d.setDate(d.getDate() + 7);
          else if (chore.recurrence_period === 'monthly') d.setMonth(d.getMonth() + 1);
          nextDueDate = d.toISOString().split('T')[0];
        }
        // Insert next occurrence (silently, don't block)
        supabase.from('chores').insert({
          family_id: chore.family_id,
          assigned_to_child_id: chore.assigned_to_child_id,
          title: chore.title,
          value: chore.value,
          status: 'assigned',
          due_date: nextDueDate,
          is_recurring: true,
          recurrence_period: chore.recurrence_period,
        });
      }
    }

    await get().fetchChores();
    set({ loading: false });
    return { error: null };
  },

  deleteChore: async (id: string) => {
    set({ loading: true });
    const { error } = await supabase.from('chores').delete().eq('id', id);
    if (error) { set({ loading: false }); return { error: error.message }; }
    await get().fetchChores();
    set({ loading: false });
    return { error: null };
  },

  fetchChildBuckets: async (childId: string) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data, error } = await supabase
      .from('buckets')
      .select('*')
      .eq('child_id', childId)
      .eq('month', month)
      .eq('year', year);

    if (!error && data) {
      set({ buckets: data as Bucket[] });
    }
  },

  fetchAllFamilyBuckets: async () => {
    const { children } = get();
    if (children.length === 0) return;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const childIds = children.map(c => c.id);

    const { data, error } = await supabase
      .from('buckets')
      .select('*')
      .in('child_id', childIds)
      .eq('month', month)
      .eq('year', year);

    if (!error && data) {
      set({ allFamilyBuckets: data as Bucket[] });
    }
  },

  fetchChildTransactions: async (childId: string) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      set({ transactions: data as Transaction[] });
    }
  },

  fetchAllFamilyTransactions: async () => {
    const { children } = get();
    if (children.length === 0) return;

    const childIds = children.map(c => c.id);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      set({ allTransactions: data as Transaction[] });
    }
  },

  markChoreDone: async (id: string) => {
    const parent = get().members.find(m => m.role === 'parent' && (m as any).expo_push_token);
    const profile = useAuthStore.getState().profile;
    if (parent && (parent as any).expo_push_token && profile?.name) {
      import('@/lib/notifications').then(({ sendPushNotification }) => {
        sendPushNotification((parent as any).expo_push_token, 'Chore Done! ✅', `${profile.name} just finished a chore!`);
      });
    }
    return get().updateChoreStatus(id, 'done');
  },

  addGift: async (childId, templateId, amount, description) => {
    set({ loading: true });
    try {
      const bucketId = await getOrCreateBucket(childId, templateId);
      const { error } = await supabase
        .from('transactions')
        .insert({ bucket_id: bucketId, child_id: childId, amount, type: 'gift', description, status: 'completed' });

      if (error) throw error;

      await get().fetchAllFamilyBuckets();
      await get().fetchChildBuckets(childId);
      await get().fetchChildTransactions(childId);

      set({ loading: false });
      return { error: null };
    } catch (e: any) {
      set({ loading: false });
      return { error: e.message };
    }
  },

  withdrawFromBucket: async (childId, templateId, amount, description) => {
    set({ loading: true });
    try {
      // Find the bucket — do NOT create one if it doesn't exist
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const { data: bucket, error: bucketErr } = await supabase
        .from('buckets')
        .select('id, cached_balance')
        .eq('child_id', childId)
        .eq('template_id', templateId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (bucketErr) throw new Error(bucketErr.message);
      if (!bucket) throw new Error('No balance found in this bucket.');
      if (bucket.cached_balance < amount) {
        throw new Error(`Insufficient balance. Available: $${bucket.cached_balance.toFixed(2)}`);
      }

      // Insert a negative transaction — DB trigger decrements cached_balance
      const { error } = await supabase
        .from('transactions')
        .insert({
          bucket_id: bucket.id,
          child_id: childId,
          amount: -amount,
          type: 'withdrawal',
          description: description || 'Withdrawal',
          status: 'completed',
        });

      if (error) throw error;

      await get().fetchAllFamilyBuckets();
      await get().fetchChildBuckets(childId);
      await get().fetchChildTransactions(childId);
      set({ loading: false });
      return { error: null };
    } catch (e: any) {
      set({ loading: false });
      return { error: e.message };
    }
  },

  processPayday: async (childId, templateDistributions, choreIds) => {
    set({ loading: true });
    try {
      // Build bucket amounts array for the RPC
      const bucketAmounts: { bucket_id: string; amount: number }[] = [];
      for (const [templateId, amount] of Object.entries(templateDistributions)) {
        if (amount > 0) {
          const bucketId = await getOrCreateBucket(childId, templateId);
          bucketAmounts.push({ bucket_id: bucketId, amount });
        }
      }

      // Call SECURITY DEFINER RPC to bypass RLS on transactions table
      const { error: rpcError } = await supabase.rpc('process_payday', {
        p_child_id: childId,
        p_bucket_amounts: bucketAmounts,
        p_chore_ids: choreIds,
      });
      if (rpcError) throw rpcError;

      await get().fetchChores();
      await get().fetchAllFamilyBuckets();
      await get().fetchChildBuckets(childId);
      await get().fetchChildTransactions(childId);

      const child = get().children.find(c => c.id === childId);
      if (child && (child as any).expo_push_token) {
        import('@/lib/notifications').then(({ sendPushNotification }) => {
          sendPushNotification((child as any).expo_push_token, 'Payday! 💸', `You just received pocket money!`);
        });
      }

      set({ loading: false });
      return { error: null };
    } catch (e: any) {
      set({ loading: false });
      return { error: e.message };
    }
  },

  fetchInterestSettings: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) return;

    const { data, error } = await supabase
      .from('interest_settings')
      .select('*')
      .eq('family_id', profile.family_id);

    if (!error && data) {
      set({ interestSettings: data as InterestSetting[] });
    }
  },

  saveInterestSetting: async (templateId: string, ratePercent: number, matchEnabled: boolean) => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) { set({ loading: false }); return { error: 'No family.' }; }

    const { error } = await supabase
      .from('interest_settings')
      .upsert(
        { family_id: profile.family_id, template_id: templateId, rate_percent: ratePercent, match_enabled: matchEnabled },
        { onConflict: 'family_id,template_id' }
      );

    if (error) { set({ loading: false }); return { error: error.message }; }

    await get().fetchInterestSettings();
    set({ loading: false });
    return { error: null };
  },

  processInterest: async () => {
    set({ loading: true });
    const { children, bucketTemplates, interestSettings } = get();
    let processed = 0;

    try {
      for (const child of children) {
        for (const template of bucketTemplates) {
          const setting = interestSettings.find(s => s.template_id === template.id);
          if (!setting || setting.rate_percent <= 0) continue;

          // Get current bucket balance
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();

          const { data: bucket } = await supabase
            .from('buckets')
            .select('id, cached_balance')
            .eq('child_id', child.id)
            .eq('template_id', template.id)
            .eq('month', month)
            .eq('year', year)
            .maybeSingle();

          if (!bucket || bucket.cached_balance <= 0) continue;

          const interestAmount = parseFloat(((bucket.cached_balance * setting.rate_percent) / 100).toFixed(2));
          if (interestAmount <= 0) continue;

          // Insert interest transaction
          const { error: intErr } = await supabase
            .from('transactions')
            .insert({ bucket_id: bucket.id, child_id: child.id, amount: interestAmount, type: 'interest', description: `Monthly Interest (${setting.rate_percent}%)`, status: 'completed' });
          if (intErr) throw intErr;
          processed++;

          // Insert parent match if enabled
          if (setting.match_enabled) {
            const { error: matchErr } = await supabase
              .from('transactions')
              .insert({ bucket_id: bucket.id, child_id: child.id, amount: interestAmount, type: 'parent_match', description: 'Parent Match', status: 'completed' });
            if (matchErr) throw matchErr;
          }
        }
      }

      await get().fetchAllFamilyBuckets();
      set({ loading: false });
      return { error: null, processed };
    } catch (e: any) {
      set({ loading: false });
      return { error: e.message, processed };
    }
  },

  reset: () => {
    set({ family: null, children: [], members: [], bucketTemplates: [], chores: [], buckets: [], allFamilyBuckets: [], transactions: [], allTransactions: [], interestSettings: [], googleMappings: [], googleConnected: false, loading: false });
  },

  // ─── Google Tasks ─────────────────────────────────────────────

  checkGoogleConnection: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return;
    const { data } = await supabase
      .from('google_tokens')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();
    set({ googleConnected: !!data });
  },

  fetchGoogleMappings: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) return;
    const { data, error } = await supabase
      .from('google_task_mappings')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      set({ googleMappings: data as GoogleTaskMapping[] });
    }
  },

  saveGoogleMapping: async (googleTasklistId, googleTasklistTitle, childId, defaultReward) => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) { set({ loading: false }); return { error: 'No family.' }; }

    const { error } = await supabase
      .from('google_task_mappings')
      .upsert(
        {
          family_id: profile.family_id,
          google_tasklist_id: googleTasklistId,
          google_tasklist_title: googleTasklistTitle,
          child_id: childId,
          default_reward: defaultReward,
        },
        { onConflict: 'family_id,google_tasklist_id' }
      );

    if (error) { set({ loading: false }); return { error: error.message }; }
    await get().fetchGoogleMappings();
    set({ loading: false });
    return { error: null };
  },

  deleteGoogleMapping: async (id) => {
    set({ loading: true });
    const { error } = await supabase.from('google_task_mappings').delete().eq('id', id);
    if (error) { set({ loading: false }); return { error: error.message }; }
    await get().fetchGoogleMappings();
    set({ loading: false });
    return { error: null };
  },

  saveGoogleTokens: async (accessToken, refreshToken, expiresIn) => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return { error: 'Not logged in.' };

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Build upsert payload — only include refresh_token when provided,
    // because Google only re-issues it with access_type=offline + prompt=consent.
    const payload: Record<string, unknown> = {
      user_id: profile.id,
      access_token: accessToken,
      expires_at: expiresAt,
    };
    if (refreshToken) {
      payload.refresh_token = refreshToken;
    }

    const { error } = await supabase
      .from('google_tokens')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) return { error: error.message };
    set({ googleConnected: true });
    return { error: null };
  },

  disconnectGoogle: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return { error: 'Not logged in.' };

    await supabase.from('google_tokens').delete().eq('user_id', profile.id);
    set({ googleConnected: false, googleMappings: [] });
    return { error: null };
  },

  syncGoogleTasks: async () => {
    set({ loading: true });
    const profile = useAuthStore.getState().profile;
    if (!profile?.family_id) {
      set({ loading: false });
      return { synced: 0, errors: ['No family.'] };
    }

    const result = await syncTasksForFamily(profile.id, profile.family_id);
    await get().fetchChores();
    await get().fetchGoogleMappings();
    set({ loading: false });
    return result;
  },
}));
