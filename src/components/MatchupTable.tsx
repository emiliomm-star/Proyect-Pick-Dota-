import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { dataset, getHero } from '../data/dataset';
import { shrunkWinrate } from '../engine';
import { HeroImage } from './HeroImage';

interface Row {
  heroId: number;
  winrate: number;
  games: number;
}

function MatchupRow({ row }: { row: Row }) {
  const hero = getHero(row.heroId);
  const advantage = row.winrate - 0.5;
  const tone = advantage >= 0 ? colors.positive : colors.negative;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(1.5) }}>
      <HeroImage heroId={row.heroId} size={40} />
      <Text style={{ color: colors.text, fontSize: 13, flex: 1 }} numberOfLines={1}>
        {hero?.localizedName ?? row.heroId}
      </Text>
      <Text style={{ color: tone, fontSize: 13, fontWeight: '700' }}>
        {(row.winrate * 100).toFixed(1)}%
      </Text>
    </View>
  );
}

/** Best and worst matchups for a hero (adversarial win rate vs each opponent). */
export function MatchupTable({ heroId }: { heroId: number }) {
  const rows = useMemo<Row[]>(() => {
    const matchups = dataset.matchups[heroId] ?? [];
    return matchups
      .filter((m) => getHero(m.heroId))
      .map((m) => ({
        heroId: m.heroId,
        winrate: shrunkWinrate(m.wins, m.gamesPlayed),
        games: m.gamesPlayed,
      }))
      .sort((a, b) => b.winrate - a.winrate);
  }, [heroId]);

  if (rows.length === 0) {
    return <Text style={{ color: colors.textMuted }}>Sin datos de matchups.</Text>;
  }

  const best = rows.slice(0, 5);
  const worst = rows.slice(-5).reverse();

  return (
    <View style={{ flexDirection: 'row', gap: spacing(4) }}>
      <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(3) }}>
        <Text style={{ color: colors.positive, fontWeight: '700', marginBottom: spacing(1) }}>Fuerte contra</Text>
        {best.map((r) => <MatchupRow key={r.heroId} row={r} />)}
      </View>
      <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(3) }}>
        <Text style={{ color: colors.negative, fontWeight: '700', marginBottom: spacing(1) }}>Débil contra</Text>
        {worst.map((r) => <MatchupRow key={r.heroId} row={r} />)}
      </View>
    </View>
  );
}
