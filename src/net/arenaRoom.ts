// Room persistence + realtime sync for the online captains arena.
// All functions no-op / throw clearly when Supabase is not configured.

import { getSupabase } from '../lib/supabase';
import { initialCaptainsState, type CaptainsState } from '../engine';

export interface RoomRow {
  code: string;
  state: CaptainsState;
  updated_at: string;
}

function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase no está configurado (falta EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).');
  return client;
}

/** Random 4-character room code (unambiguous characters). */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createRoom(code: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('arena_rooms')
    .upsert({ code, state: initialCaptainsState(), updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  const client = requireClient();
  const { data, error } = await client.from('arena_rooms').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return (data as RoomRow | null) ?? null;
}

export async function setRoomState(code: string, state: CaptainsState): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('arena_rooms')
    .update({ state, updated_at: new Date().toISOString() })
    .eq('code', code);
  if (error) throw error;
}

/** Subscribe to room changes. Returns an unsubscribe function. */
export function subscribeRoom(code: string, onState: (state: CaptainsState) => void): () => void {
  const client = getSupabase();
  if (!client) return () => {};
  const channel = client
    .channel(`arena_room:${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'arena_rooms', filter: `code=eq.${code}` },
      (payload) => {
        const row = payload.new as RoomRow | undefined;
        if (row?.state) onState(row.state);
      },
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
