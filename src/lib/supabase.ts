// Supabase client, created LAZILY and only when configured.
//
// Lazy creation matters: Expo renders web pages in Node during dev/export (SSR),
// and @supabase/realtime-js needs a WebSocket that Node < 22 lacks. By creating
// the client only on first use (which happens in browser/native event handlers,
// never during SSR), we avoid the "native WebSocket not found" crash and the app
// works on any Node version. Everything must handle a null return.

import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/** Returns the Supabase client, creating it on first call. Null if unconfigured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;
  cached = createClient(url as string, anonKey as string, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return cached;
}
