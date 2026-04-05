import { createClient } from '@supabase/supabase-js';

// Read Supabase project URL and anon key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Export singleton Supabase client for use throughout app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
