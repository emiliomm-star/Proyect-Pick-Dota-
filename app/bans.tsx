import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius, spacing } from '../src/theme';
import { dataset, getHero } from '../src/data/dataset';
import { useDraftStore } from '../src/store/draftStore';
import { recommendBans } from '../src/engine';
import { HeroImage } from '../src/components/HeroImage';

function pp(v: number): string {
  const p = v * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}`;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: tone ?? colors.textMuted, fontSize: 12, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

export default function BansScreen() {
  const myTeam = useDraftStore((s) => s.myTeam);
  const enemy = useDraftStore((s) => s.enemy);
  const bans = useDraftStore((s) => s.bans);
  const bracket = useDraftStore((s) => s.bracket);
  const addHero = useDraftStore((s) => s.addHero);

  const suggestions = useMemo(
    () => recommendBans(dataset, { myTeam, enemy, bans }, { bracket, limit: 20 }),
    [myTeam, enemy, bans, bracket],
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(3) }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Sugerencias de baneo</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        Prioriza héroes fuertes en el meta, que amenacen a tu equipo o muy contestados en pro.
        Toca "Banear" para añadirlo a tus baneos.
      </Text>

      {suggestions.map((s) => {
        const hero = getHero(s.heroId);
        const { metaAdvantage, threatToMyTeam, proBanRate } = s.breakdown;
        return (
          <View
            key={s.heroId}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing(2.5),
              gap: spacing(2),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
              <HeroImage heroId={s.heroId} size={56} />
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 }}>
                {hero?.localizedName ?? s.heroId}
              </Text>
              <Pressable
                onPress={() => addHero('bans', s.heroId)}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(2),
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  backgroundColor: pressed ? colors.accent : 'transparent',
                })}
              >
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Banear</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Metric label="meta" value={`${pp(metaAdvantage)} pp`} tone={metaAdvantage >= 0 ? colors.positive : colors.negative} />
              <Metric label="amenaza" value={`${pp(threatToMyTeam)} pp`} tone={threatToMyTeam > 0 ? colors.negative : colors.textMuted} />
              <Metric label="pro ban" value={`${Math.round(proBanRate * 100)}%`} tone={proBanRate > 0 ? colors.neutral : colors.textMuted} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
