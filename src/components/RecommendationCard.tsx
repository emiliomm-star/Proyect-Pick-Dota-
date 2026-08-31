import { Pressable, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { getHero } from '../data/dataset';
import type { Recommendation } from '../engine';
import { HeroImage } from './HeroImage';

function pp(value: number): string {
  const points = value * 100;
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points.toFixed(1)} pp`;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' | 'muted' }) {
  const color = tone === 'pos' ? colors.positive : tone === 'neg' ? colors.negative : colors.textMuted;
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

interface Props {
  rank: number;
  rec: Recommendation;
  onPress: () => void;
}

export function RecommendationCard({ rank, rec, onPress }: Props) {
  const hero = getHero(rec.heroId);
  const { metaAdvantage, counterAdvantage, roleFit } = rec.breakdown;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing(2.5),
        gap: spacing(3),
      })}
    >
      <Text style={{ color: colors.textMuted, fontWeight: '800', width: 22, textAlign: 'center' }}>
        {rank}
      </Text>
      <HeroImage heroId={rec.heroId} size={64} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
          {hero?.localizedName ?? rec.heroId}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>
          {hero?.roles.slice(0, 4).join(' · ')}
        </Text>
        {rec.coveredMissingRoles.length > 0 && (
          <Text style={{ color: colors.neutral, fontSize: 11, marginTop: 2 }}>
            Cubre: {rec.coveredMissingRoles.join(', ')}
          </Text>
        )}
        <View style={{ flexDirection: 'row', marginTop: spacing(2) }}>
          <Metric label="meta" value={pp(metaAdvantage)} tone={metaAdvantage >= 0 ? 'pos' : 'neg'} />
          <Metric
            label="counter"
            value={pp(counterAdvantage)}
            tone={counterAdvantage > 0 ? 'pos' : counterAdvantage < 0 ? 'neg' : 'muted'}
          />
          <Metric label="rol" value={`${Math.round(roleFit * 100)}%`} tone={roleFit > 0 ? 'pos' : 'muted'} />
        </View>
      </View>
    </Pressable>
  );
}
