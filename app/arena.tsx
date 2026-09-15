import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius, spacing } from '../src/theme';
import { dataset, getHero } from '../src/data/dataset';
import {
  applyChoice,
  CAPTAINS_SEQUENCE,
  currentStep,
  initialCaptainsState,
  isComplete,
  skipStep,
  usedHeroes,
  type CaptainsState,
  type DraftTeam,
} from '../src/engine';
import { HeroImage } from '../src/components/HeroImage';
import { HeroPicker } from '../src/components/HeroPicker';
import { DraftReportView } from '../src/components/DraftReportView';
import { TurnTimer } from '../src/components/TurnTimer';

/** A random hero not yet used, for auto-pick when the timer runs out. */
function randomAvailable(used: Set<number>): number | null {
  const pool = dataset.heroes.filter((h) => !used.has(h.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

const teamColor = (t: DraftTeam) => (t === 'radiant' ? colors.ally : colors.enemy);
const teamName = (t: DraftTeam) => (t === 'radiant' ? 'Radiant' : 'Dire');

export default function ArenaScreen() {
  const [state, setState] = useState<CaptainsState>(initialCaptainsState);
  const [pickerOpen, setPickerOpen] = useState(false);

  const used = useMemo(() => usedHeroes(state), [state]);
  const step = currentStep(state);
  const complete = isComplete(state);
  const stepNumber = state.stepIndex + 1;

  const choose = (heroId: number) => {
    setState((s) => applyChoice(s, heroId));
    setPickerOpen(false);
  };

  // Timer ran out: auto-pick a random hero, or skip the ban.
  const handleTimeout = useCallback(() => {
    setState((s) => {
      const cur = currentStep(s);
      if (!cur) return s;
      if (cur.action === 'pick') {
        const id = randomAvailable(usedHeroes(s));
        return id == null ? s : applyChoice(s, id);
      }
      return skipStep(s);
    });
    setPickerOpen(false);
  }, []);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
      <View>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Arena de capitanes (local)</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing(1) }}>
          Dos capitanes se turnan en un mismo dispositivo (pass-and-play), estilo Captains Mode.
          Al terminar, el juez dicta el ganador y el informe para aprender.
        </Text>
      </View>

      {/* Turn banner */}
      {!complete && step && (
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: teamColor(step.team),
            padding: spacing(4),
            alignItems: 'center',
            gap: spacing(1),
          })}
        >
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Paso {stepNumber} / {CAPTAINS_SEQUENCE.length}</Text>
          <Text style={{ color: teamColor(step.team), fontSize: 20, fontWeight: '800' }}>
            {teamName(step.team)} · {step.action === 'ban' ? 'BANEA' : 'PICKEA'}
          </Text>
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>Toca para elegir héroe</Text>
          <View style={{ alignSelf: 'stretch', marginTop: spacing(2) }}>
            <TurnTimer deadline={state.deadline} active onExpire={handleTimeout} />
          </View>
        </Pressable>
      )}

      {/* Boards */}
      <View style={{ flexDirection: 'row', gap: spacing(4) }}>
        <SideBoard title="Radiant" accent={colors.ally} picks={state.radiantPicks} bans={state.radiantBans} />
        <SideBoard title="Dire" accent={colors.enemy} picks={state.direPicks} bans={state.direBans} />
      </View>

      {/* Verdict + report */}
      {complete && (
        <View style={{ gap: spacing(3) }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Resultado del draft</Text>
          <DraftReportView radiant={state.radiantPicks} dire={state.direPicks} />
        </View>
      )}

      <Pressable
        onPress={() => { setState(initialCaptainsState()); setPickerOpen(false); }}
        style={({ pressed }) => ({ alignSelf: 'flex-start', paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, backgroundColor: pressed ? colors.accent : 'transparent' })}
      >
        <Text style={{ color: colors.text, fontWeight: '700' }}>Reiniciar draft</Text>
      </Pressable>

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

function SideBoard({
  title,
  accent,
  picks,
  bans,
}: {
  title: string;
  accent: string;
  picks: number[];
  bans: number[];
}) {
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
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Baneos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) }}>
            {bans.map((id) => (
              <HeroImage key={id} heroId={id} size={30} style={{ opacity: 0.5 }} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
