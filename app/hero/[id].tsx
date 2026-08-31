import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { colors, radius, spacing } from '../../src/theme';
import { dataset, getHero } from '../../src/data/dataset';
import { heroWinrate } from '../../src/engine';
import { BRACKETS, type HeroStat } from '../../src/data/types';
import { HeroImage } from '../../src/components/HeroImage';
import { RoleBadge } from '../../src/components/RoleBadge';
import { ItemBuild } from '../../src/components/ItemBuild';
import { MatchupTable } from '../../src/components/MatchupTable';
import { useDraftStore } from '../../src/store/draftStore';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function HeroDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const heroId = Number(params.id);
  const hero = getHero(heroId);
  const addHero = useDraftStore((s) => s.addHero);

  const stat = useMemo<HeroStat | undefined>(
    () => dataset.stats.find((s) => s.heroId === heroId),
    [heroId],
  );

  if (!hero) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Héroe no encontrado.</Text>
      </View>
    );
  }

  const brackets = BRACKETS.filter((b) => stat?.byBracket?.[b]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(5) }}>
      <Stack.Screen options={{ title: hero.localizedName }} />

      {/* Header */}
      <View style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'center' }}>
        <HeroImage heroId={heroId} size={110} />
        <View style={{ flex: 1, gap: spacing(2) }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{hero.localizedName}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {hero.primaryAttr.toUpperCase()} · {hero.attackType === 'Melee' ? 'Cuerpo a cuerpo' : 'A distancia'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) }}>
            {hero.roles.map((r) => <RoleBadge key={r} role={r} />)}
          </View>
        </View>
      </View>

      {/* Quick add */}
      <View style={{ flexDirection: 'row', gap: spacing(3) }}>
        <AddButton label="A tu equipo" color={colors.ally} onPress={() => { addHero('myTeam', heroId); router.back(); }} />
        <AddButton label="Al enemigo" color={colors.enemy} onPress={() => { addHero('enemy', heroId); router.back(); }} />
      </View>

      {/* Winrate by bracket */}
      <Section title="Win rate por bracket">
        {brackets.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>Sin datos.</Text>
        ) : (
          <View style={{ gap: spacing(2) }}>
            {brackets.map((b) => {
              const wr = heroWinrate(stat, b);
              const pct = wr * 100;
              return (
                <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                  <Text style={{ color: colors.textMuted, width: 80, textTransform: 'capitalize', fontSize: 12 }}>{b}</Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.max(0, Math.min(100, (pct - 40) * 5))}%`, height: '100%', backgroundColor: wr >= 0.5 ? colors.positive : colors.negative }} />
                  </View>
                  <Text style={{ color: colors.text, width: 52, textAlign: 'right', fontWeight: '700', fontSize: 12 }}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              Barra escalada al rango 40–60% para hacer visibles las diferencias.
            </Text>
          </View>
        )}
      </Section>

      {/* Item build */}
      <Section title="Build de items por fase">
        <ItemBuild heroId={heroId} />
      </Section>

      {/* Matchups */}
      <Section title="Matchups (vs enemigo)">
        <MatchupTable heroId={heroId} />
      </Section>
    </ScrollView>
  );
}

function AddButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: spacing(2.5),
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: color,
        alignItems: 'center',
        backgroundColor: pressed ? color : 'transparent',
      })}
    >
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
