import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { getAttributes } from '../data/heroAttributes';
import { analyzeComposition, NEEDS, NEED_LABELS } from '../engine';

function NeedChip({ label, covered }: { label: string; covered: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: covered ? colors.positive : colors.border,
        backgroundColor: covered ? 'rgba(63,185,80,0.12)' : 'transparent',
      }}
    >
      <Text style={{ color: covered ? colors.positive : colors.textMuted, fontSize: 11 }}>
        {covered ? '✓' : '×'}
      </Text>
      <Text style={{ color: covered ? colors.text : colors.textMuted, fontSize: 11, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function DamageBar({ magical, physical, pure }: { magical: number; physical: number; pure: number }) {
  const total = magical + physical + pure || 1;
  const seg = (n: number, color: string) =>
    n > 0 ? <View style={{ flex: n / total, backgroundColor: color }} /> : null;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
        {seg(magical, '#c56bd6')}
        {seg(physical, '#e5a03d')}
        {seg(pure, '#e5534b')}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: 4 }}>
        <Legend color="#c56bd6" label={`Mágico ${magical}`} />
        <Legend color="#e5a03d" label={`Físico ${physical}`} />
        {pure > 0 && <Legend color="#e5534b" label={`Puro ${pure}`} />}
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function CompositionPanel({ myTeam, enemy }: { myTeam: number[]; enemy: number[] }) {
  const report = useMemo(
    () => analyzeComposition(myTeam, enemy, getAttributes),
    [myTeam, enemy],
  );

  if (myTeam.length === 0 && enemy.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing(3),
        gap: spacing(3),
      }}
    >
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Composición de tu equipo</Text>

      <DamageBar {...report.team.damageMix} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) }}>
        {NEEDS.map((need) => (
          <NeedChip key={need} label={NEED_LABELS[need]} covered={report.team.covered.has(need)} />
        ))}
      </View>

      {report.warnings.length > 0 && (
        <View style={{ gap: spacing(1) }}>
          {report.warnings.map((w) => (
            <Text key={w} style={{ color: colors.neutral, fontSize: 12 }}>
              ⚠ {w}
            </Text>
          ))}
        </View>
      )}

      {report.enemyThreat.length > 0 && (
        <View style={{ gap: spacing(1), borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing(2) }}>
          <Text style={{ color: colors.enemy, fontWeight: '700', fontSize: 12 }}>Amenaza enemiga</Text>
          {report.enemyThreat.map((n) => (
            <Text key={n} style={{ color: colors.textMuted, fontSize: 12 }}>
              • {n}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
