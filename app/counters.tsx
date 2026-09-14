import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../src/theme';
import { dataset, getHero } from '../src/data/dataset';
import { useDraftStore } from '../src/store/draftStore';
import { topCountersAgainst, type CounterCell } from '../src/engine';
import { HeroImage } from '../src/components/HeroImage';

function pp(v: number): string {
  const p = v * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}`;
}

function Cell({ cell }: { cell: CounterCell }) {
  if (cell.missing) return null;
  const tone = cell.advantage >= 0 ? colors.positive : colors.negative;
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <HeroImage heroId={cell.enemyId} size={34} />
      <Text style={{ color: tone, fontSize: 10, fontWeight: '700' }}>
        {(cell.winrate * 100).toFixed(0)}%
      </Text>
    </View>
  );
}

export default function CountersScreen() {
  const enemy = useDraftStore((s) => s.enemy);
  const usedHeroIds = useDraftStore((s) => s.usedHeroIds);
  const used = usedHeroIds();

  const ranked = useMemo(
    () => topCountersAgainst(dataset, enemy, { exclude: used, limit: 20 }),
    [enemy, used],
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(3) }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Counters al equipo enemigo</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        Ranking puro por ventaja de matchup contra la línea enemiga (win rate suavizado).
        Toca un héroe para ver su ficha.
      </Text>

      {enemy.length === 0 ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing(4) }}>
          Añade héroes al equipo enemigo en el draft para ver quién los contrarresta.
        </Text>
      ) : (
        ranked.map((entry) => {
          const hero = getHero(entry.heroId);
          const tone = entry.avgAdvantage >= 0 ? colors.positive : colors.negative;
          return (
            <Pressable
              key={entry.heroId}
              onPress={() => router.push(`/hero/${entry.heroId}`)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing(2.5),
                gap: spacing(2),
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                <HeroImage heroId={entry.heroId} size={56} />
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 }}>
                  {hero?.localizedName ?? entry.heroId}
                </Text>
                <Text style={{ color: tone, fontSize: 15, fontWeight: '800' }}>
                  {pp(entry.avgAdvantage)} pp
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
                {entry.perEnemy.map((c) => (
                  <Cell key={c.enemyId} cell={c} />
                ))}
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}
