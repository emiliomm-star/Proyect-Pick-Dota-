import { Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { dataset } from '../data/dataset';
import { itemBuildFor, type Phase, type ResolvedItem } from '../engine';

const PHASE_LABELS: Record<Phase, string> = {
  start: 'Inicio',
  early: 'Temprano',
  mid: 'Medio',
  late: 'Tardío',
};

function ItemChip({ item }: { item: ResolvedItem }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing(2),
        paddingVertical: spacing(1.5),
        gap: spacing(2),
      }}
    >
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{item.name}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{Math.round(item.share * 100)}%</Text>
    </View>
  );
}

export function ItemBuild({ heroId }: { heroId: number }) {
  const build = itemBuildFor(dataset, heroId, 5);

  if (!build) {
    return (
      <Text style={{ color: colors.textMuted }}>
        No hay datos de items para este héroe en el dataset.
      </Text>
    );
  }

  const phases: Phase[] = ['start', 'early', 'mid', 'late'];

  return (
    <View style={{ gap: spacing(3) }}>
      {phases.map((phase) => (
        <View key={phase}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: spacing(1.5) }}>
            {PHASE_LABELS[phase]}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {build[phase].length > 0 ? (
              build[phase].map((item) => <ItemChip key={item.itemId} item={item} />)
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>—</Text>
            )}
          </View>
        </View>
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 11, fontStyle: 'italic' }}>
        % = frecuencia con la que se compra el item en esa fase (datos de OpenDota,
        sin interpretación añadida).
      </Text>
    </View>
  );
}
