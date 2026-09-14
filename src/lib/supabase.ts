// Supabase client, created only when the project is configured via env vars.
// Everything that uses it must handle `supabase === null` so the app keeps
// working (local arena, recommender, etc.) with no backend configured.

import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;
