import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { colors, radius, spacing } from '../src/theme';
import { dataset, availableBrackets } from '../src/data/dataset';
import { getAttributes } from '../src/data/heroAttributes';
import { useDraftStore, type Team } from '../src/store/draftStore';
import { recommendHeroes } from '../src/engine';
import { DraftColumn } from '../src/components/DraftColumn';
import { HeroPicker } from '../src/components/HeroPicker';
import { RecommendationCard } from '../src/components/RecommendationCard';
import { CompositionPanel } from '../src/components/CompositionPanel';
import { HeroImage } from '../src/components/HeroImage';

const TEAM_TITLES: Record<Team, string> = {
  myTeam: 'Tu equipo',
  enemy: 'Enemigo',
  bans: 'Baneos',
};

export default function DraftScreen() {
  const myTeam = useDraftStore((s) => s.myTeam);
  const enemy = useDraftStore((s) => s.enemy);
  const bans = useDraftStore((s) => s.bans);
  const bracket = useDraftStore((s) => s.bracket);
  const weights = useDraftStore((s) => s.weights);
  const addHero = useDraftStore((s) => s.addHero);
  const removeHero = useDraftStore((s) => s.removeHero);
  const reset = useDraftStore((s) => s.reset);
  const setBracket = useDraftStore((s) => s.setBracket);

  const [picker, setPicker] = useState<Team | null>(null);

  const used = useMemo(
    () => new Set<number>([...myTeam, ...enemy, ...bans]),
    [myTeam, enemy, bans],
  );

  const recommendations = useMemo(
    () =>
      recommendHeroes(
        dataset,
        { myTeam, enemy, bans },
        { bracket, weights, limit: 12, attributesFor: getAttributes },
      ),
    [myTeam, enemy, bans, bracket, weights],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
        {/* Bracket + actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Patch {dataset.patch} · {dataset.heroes.length} héroes
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing(3) }}>
            <Pressable onPress={reset} hitSlop={8}>
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Reiniciar</Text>
            </Pressable>
            <Link href="/settings" asChild>
              <Pressable hitSlop={8}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Ajustes</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <BracketSelector value={bracket} onChange={setBracket} options={availableBrackets} />

        {/* Draft board */}
        <View style={{ flexDirection: 'row', gap: spacing(4) }}>
          <DraftColumn
            title={TEAM_TITLES.myTeam}
            accent={colors.ally}
            heroIds={myTeam}
            slots={5}
            onAddPress={() => setPicker('myTeam')}
            onRemove={(id) => removeHero('myTeam', id)}
          />
          <DraftColumn
            title={TEAM_TITLES.enemy}
            accent={colors.enemy}
            heroIds={enemy}
            slots={5}
            onAddPress={() => setPicker('enemy')}
            onRemove={(id) => removeHero('enemy', id)}
          />
        </View>

        {/* Bans */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(2) }}>
            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>
              {TEAM_TITLES.bans} ({bans.length})
            </Text>
            <Pressable onPress={() => setPicker('bans')} hitSlop={8}>
              <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>＋ Añadir</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {bans.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Ninguno</Text>
            ) : (
              bans.map((id) => (
                <Pressable key={id} onPress={() => removeHero('bans', id)}>
                  <HeroImage heroId={id} size={44} style={{ opacity: 0.55 }} />
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Composition analysis */}
        <CompositionPanel myTeam={myTeam} enemy={enemy} />

        {/* Recommendations */}
        <View style={{ gap: spacing(2) }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
            Recomendaciones para tu equipo
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing(1) }}>
            Ordenadas por ventaja combinada (meta + counter + rol faltante).
          </Text>
          {recommendations.map((rec, i) => (
            <RecommendationCard
              key={rec.heroId}
              rank={i + 1}
              rec={rec}
              onPress={() => router.push(`/hero/${rec.heroId}`)}
            />
          ))}
        </View>
      </ScrollView>

      <HeroPicker
        visible={picker !== null}
        title={picker ? `Elegir héroe — ${TEAM_TITLES[picker]}` : ''}
        excluded={used}
        onSelect={(id) => {
          if (picker) addHero(picker, id);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

function BracketSelector({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (b: never) => void;
  options: string[];
}) {
  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing(1.5) }}>
        Bracket de skill
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(2) }}>
        {options.map((b) => {
          const active = b === value;
          return (
            <Pressable
              key={b}
              onPress={() => onChange(b as never)}
              style={{
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(1.5),
                borderRadius: radius.md,
                backgroundColor: active ? colors.accent : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
              }}
            >
              <Text style={{ color: active ? colors.text : colors.textMuted, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }}>
                {b}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
