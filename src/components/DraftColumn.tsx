import { Pressable, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { getHero } from '../data/dataset';
import { HeroImage } from './HeroImage';

interface Props {
  title: string;
  accent: string;
  heroIds: number[];
  slots: number;
  onAddPress: () => void;
  onRemove: (heroId: number) => void;
}

/** A team's picks rendered as a fixed number of slots. */
export function DraftColumn({ title, accent, heroIds, slots, onAddPress, onRemove }: Props) {
  const rows = Array.from({ length: slots }, (_, i) => heroIds[i]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: accent, fontWeight: '700', fontSize: 14, marginBottom: spacing(2) }}>
        {title} ({heroIds.length}/{slots})
      </Text>
      <View style={{ gap: spacing(2) }}>
        {rows.map((heroId, idx) => {
          if (heroId == null) {
            return (
              <Pressable
                key={`empty-${idx}`}
                onPress={onAddPress}
                style={({ pressed }) => ({
                  height: 44,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                })}
              >
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>＋</Text>
              </Pressable>
            );
          }
          const hero = getHero(heroId);
          return (
            <Pressable
              key={heroId}
              onPress={() => onRemove(heroId)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                height: 44,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingRight: spacing(2),
                overflow: 'hidden',
              })}
            >
              <HeroImage heroId={heroId} size={62} style={{ borderRadius: 0 }} />
              <Text
                numberOfLines={1}
                style={{ color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, marginLeft: spacing(2) }}
              >
                {hero?.localizedName ?? heroId}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>✕</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
