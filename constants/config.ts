// Supabase configuration
// For local development, these point to the local Supabase instance.
// Replace with your hosted Supabase project values for production.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Invite code settings
export const INVITE_CODE_LENGTH = 6;
