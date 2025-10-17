import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedError: Error | null = null;

const buildSupabaseClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    cachedError = new Error(
      'Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable realtime features.',
    );
    throw cachedError;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
};

export const getSupabaseClient = (): SupabaseClient => {
  try {
    return buildSupabaseClient();
  } catch (error) {
    throw error instanceof Error ? error : new Error('Supabase client could not be created');
  }
};

export const tryGetSupabaseClient = (): SupabaseClient | null => {
  try {
    return buildSupabaseClient();
  } catch {
    return null;
  }
};
