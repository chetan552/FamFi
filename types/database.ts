// TypeScript types matching the Supabase database schema

export type UserRole = 'parent' | 'child';
export type TransactionType = 'chore_earning' | 'gift' | 'interest' | 'parent_match' | 'adjustment' | 'withdrawal';
export type TransactionStatus = 'pending' | 'completed';
export type ChoreStatus = 'assigned' | 'done' | 'approved' | 'paid';

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  default_chore_reward: number;
  created_at: string;
}

export interface User {
  id: string;
  family_id: string | null;
  auth_id: string | null;
  role: UserRole;
  name: string;
  avatar_emoji: string;
  expo_push_token: string | null;
  created_at: string;
}

export interface BucketTemplate {
  id: string;
  family_id: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Bucket {
  id: string;
  child_id: string;
  template_id: string;
  month: number;
  year: number;
  cached_balance: number;
}

export interface Transaction {
  id: string;
  bucket_id: string;
  child_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  status: TransactionStatus;
  created_at: string;
}

export type RecurrencePeriod = 'daily' | 'weekly' | 'monthly';

export type ChoreSource = 'manual' | 'google_tasks';

export interface Chore {
  id: string;
  family_id: string;
  assigned_to_child_id: string;
  title: string;
  value: number;
  status: ChoreStatus;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_period: RecurrencePeriod | null;
  source: ChoreSource;
  google_task_id: string | null;
  created_at: string;
}

export interface InterestSetting {
  id: string;
  family_id: string;
  template_id: string;
  rate_percent: number;
  match_enabled: boolean;
}

export interface GoogleToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

export interface GoogleTaskMapping {
  id: string;
  family_id: string;
  google_tasklist_id: string;
  google_tasklist_title: string;
  child_id: string;
  default_reward: number;
  last_synced_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface FamilyBucketBalance {
  child_id: string;
  template_id: string;
  balance: number;
}

export interface FamilyRecentTransaction {
  id: string;
  bucket_id: string;
  child_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  status: TransactionStatus;
  created_at: string;
}
