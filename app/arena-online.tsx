import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../src/theme';
import { getHero } from '../src/data/dataset';
import { isSupabaseConfigured } from '../src/lib/supabase';
import {
  applyChoice,
  currentStep,
  isComplete,
  usedHeroes,
  CAPTAINS_SEQUENCE,
  type CaptainsState,
  type DraftTeam,
} from '../src/engine';
import {
  createRoom,
  generateRoomCode,
  getRoom,
  setRoomState,
  subscribeRoom,
} from '../src/net/arenaRoom';
import { HeroImage } from '../src/components/HeroImage';
import { HeroPicker } from '../src/components/HeroPicker';
import { DraftReportView } from '../src/components/DraftReportView';

const teamColor = (t: DraftTeam) => (t === 'radiant' ? colors.ally : colors.enemy);
const teamName = (t: DraftTeam) => (t === 'radiant' ? 'Radiant' : 'Dire');

export default function ArenaOnlineScreen() {
  if (!isSupabaseConfigured) return <SetupInstructions />;
  return <OnlineArena />;
}

function OnlineArena() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<DraftTeam | null>(null);
  const [state, setState] = useState<CaptainsState | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Realtime subscription tied to the active room.
  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeRoom(roomCode, (s) => setState(s));
    return unsub;
  }, [roomCode]);

  const handleCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const code = generateRoomCode();
      await createRoom(code);
      const room = await getRoom(code);
      setRoomCode(code);
      setMyRole('radiant');
      setState(room?.state ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const room = await getRoom(code);
      if (!room) {
        setError('No existe una sala con ese código.');
        return;
      }
      setRoomCode(code);
      setMyRole('dire');
      setState(room.state);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [joinCode]);

  const leave = useCallback(() => {
    setRoomCode(null);
    setMyRole(null);
    setState(null);
    setError(null);
  }, []);

  const used = useMemo(() => (state ? usedHeroes(state) : new Set<number>()), [state]);

  const choose = useCallback(
    async (heroId: number) => {
      if (!roomCode || !state) return;
      const next = applyChoice(state, heroId);
      setState(next); // optimistic
      setPickerOpen(false);
      try {
        await setRoomState(roomCode, next);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [roomCode, state],
  );

  // Lobby
  if (!roomCode || !state || !myRole) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Arena online</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          Crea una sala y comparte el código con el otro capitán, o únete a una existente.
        </Text>

        <Pressable
          onPress={handleCreate}
          disabled={busy}
          style={({ pressed }) => ({ padding: spacing(3.5), borderRadius: radius.md, borderWidth: 1, borderColor: colors.ally, alignItems: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent', opacity: busy ? 0.5 : 1 })}
        >
          <Text style={{ color: colors.ally, fontWeight: '800' }}>Crear sala (serás Radiant)</Text>
        </Pressable>

        <View style={{ gap: spacing(2) }}>
          <TextInput
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="Código de sala"
            autoCapitalize="characters"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing(3), paddingVertical: spacing(2.5), borderWidth: 1, borderColor: colors.border }}
          />
          <Pressable
            onPress={handleJoin}
            disabled={busy}
            style={({ pressed }) => ({ padding: spacing(3.5), borderRadius: radius.md, borderWidth: 1, borderColor: colors.enemy, alignItems: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent', opacity: busy ? 0.5 : 1 })}
          >
            <Text style={{ color: colors.enemy, fontWeight: '800' }}>Unirse (serás Dire)</Text>
          </Pressable>
        </View>

        {busy && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={{ color: colors.negative, fontSize: 13 }}>{error}</Text>}
      </ScrollView>
    );
  }

  // Playing
  const step = currentStep(state);
  const complete = isComplete(state);
  const myTurn = !complete && step?.team === myRole;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>
          Sala <Text style={{ color: colors.accent }}>{roomCode}</Text>
        </Text>
        <Pressable onPress={leave} hitSlop={8}>
          <Text style={{ color: colors.textMuted }}>Salir</Text>
        </Pressable>
      </View>
      <Text style={{ color: teamColor(myRole), fontSize: 12, fontWeight: '700' }}>Juegas como {teamName(myRole)}</Text>

      {!complete && step && (
        <Pressable
          onPress={() => myTurn && setPickerOpen(true)}
          disabled={!myTurn}
          style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, borderColor: teamColor(step.team), padding: spacing(4), alignItems: 'center', gap: spacing(1), opacity: myTurn ? 1 : 0.6 }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Paso {state.stepIndex + 1} / {CAPTAINS_SEQUENCE.length}</Text>
          <Text style={{ color: teamColor(step.team), fontSize: 20, fontWeight: '800' }}>
            {teamName(step.team)} · {step.action === 'ban' ? 'BANEA' : 'PICKEA'}
          </Text>
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
            {myTurn ? 'Tu turno — toca para elegir' : 'Esperando al rival…'}
          </Text>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', gap: spacing(4) }}>
        <SideBoard title="Radiant" accent={colors.ally} picks={state.radiantPicks} bans={state.radiantBans} />
        <SideBoard title="Dire" accent={colors.enemy} picks={state.direPicks} bans={state.direBans} />
      </View>

      {complete && (
        <View style={{ gap: spacing(3) }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Resultado del draft</Text>
          <DraftReportView radiant={state.radiantPicks} dire={state.direPicks} />
        </View>
      )}

      {error && <Text style={{ color: colors.negative, fontSize: 13 }}>{error}</Text>}

      <HeroPicker
        visible={pickerOpen}
        title={step ? `${teamName(step.team)} — ${step.action === 'ban' ? 'Banear' : 'Pickear'}` : ''}
        excluded={used}
        remaining={1}
        onSelect={choose}
        onClose={() => setPickerOpen(false)}
      />
    </ScrollView>
  );
}

function SideBoard({ title, accent, picks, bans }: { title: string; accent: string; picks: number[]; bans: number[] }) {
  const slots = Array.from({ length: 5 }, (_, i) => picks[i]);
  return (
    <View style={{ flex: 1, gap: spacing(2) }}>
      <Text style={{ color: accent, fontWeight: '700' }}>{title} ({picks.length}/5)</Text>
      <View style={{ gap: spacing(2) }}>
        {slots.map((id, idx) =>
          id == null ? (
            <View key={`e-${idx}`} style={{ height: 40, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }} />
          ) : (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <HeroImage heroId={id} size={56} style={{ borderRadius: 0 }} />
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, flex: 1, marginLeft: spacing(2) }}>
                {getHero(id)?.localizedName ?? id}
              </Text>
            </View>
          ),
        )}
      </View>
      {bans.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) }}>
          {bans.map((id) => <HeroImage key={id} heroId={id} size={28} style={{ opacity: 0.5 }} />)}
        </View>
      )}
    </View>
  );
}

function SetupInstructions() {
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(3) }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Arena online — configuración</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        La arena online necesita un proyecto Supabase (gratis). Una vez configurado, esta
        pantalla se activa sola.
      </Text>
      {[
        '1. Crea un proyecto en supabase.com.',
        '2. En el SQL Editor, ejecuta el archivo db/schema.sql del repo.',
        '3. Copia la Project URL y la anon key (Settings → API).',
        '4. Crea un archivo .env en la raíz con:',
        '     EXPO_PUBLIC_SUPABASE_URL=...',
        '     EXPO_PUBLIC_SUPABASE_ANON_KEY=...',
        '5. Reinicia el servidor (npm run web).',
      ].map((line) => (
        <Text key={line} style={{ color: colors.text, fontSize: 13, fontFamily: 'monospace' }}>{line}</Text>
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: 'italic' }}>
        Mientras tanto, la arena local (pass-and-play) funciona sin backend.
      </Text>
    </ScrollView>
  );
}
