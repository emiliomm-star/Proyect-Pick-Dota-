import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../src/theme';
import { dataset, getHero } from '../src/data/dataset';
import { getAttributes } from '../src/data/heroAttributes';
import { predictDraft } from '../src/engine';
import { HeroImage } from '../src/components/HeroImage';
import { HeroPicker } from '../src/components/HeroPicker';
import { DraftReportView } from '../src/components/DraftReportView';

type Side = 'radiant' | 'dire';

export default function SimulatorScreen() {
  const [radiant, setRadiant] = useState<number[]>([]);
  const [dire, setDire] = useState<number[]>([]);
  const [picker, setPicker] = useState<Side | null>(null);
  const [showReport, setShowReport] = useState(false);

  const used = useMemo(() => new Set<number>([...radiant, ...dire]), [radiant, dire]);

  const prediction = useMemo(
    () => predictDraft(dataset, radiant, dire, { bracket: 'legend', attributesFor: getAttributes }),
    [radiant, dire],
  );

  const add = (side: Side, id: number) =>
    (side === 'radiant' ? setRadiant : setDire)((prev) =>
      prev.length >= 5 || used.has(id) ? prev : [...prev, id],
    );
  const remove = (side: Side, id: number) =>
    (side === 'radiant' ? setRadiant : setDire)((prev) => prev.filter((h) => h !== id));

  const radiantPct = Math.round(prediction.radiantWinProb * 100);
  const direPct = 100 - radiantPct;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
      <View>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Simulador de batalla de pickeos</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing(1) }}>
          Arma dos drafts y estima quién gana. No reproduce la partida: compone matchups,
          meta y composición. Es una estimación, no un oráculo.
        </Text>
      </View>

      {/* Probability bar */}
      <View style={{ gap: spacing(2) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.ally, fontWeight: '800' }}>Radiant {prediction.incomplete ? '—' : `${radiantPct}%`}</Text>
          <Text style={{ color: colors.enemy, fontWeight: '800' }}>{prediction.incomplete ? '—' : `${direPct}%`} Dire</Text>
        </View>
        <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
          <View style={{ flex: prediction.incomplete ? 1 : prediction.radiantWinProb, backgroundColor: colors.ally }} />
          <View style={{ flex: prediction.incomplete ? 1 : prediction.direWinProb, backgroundColor: colors.enemy }} />
        </View>
        {prediction.incomplete && (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Añade héroes a ambos lados para ver la predicción.</Text>
        )}
      </View>

      {/* Teams */}
      <View style={{ flexDirection: 'row', gap: spacing(4) }}>
        <SideColumn title="Radiant" accent={colors.ally} heroIds={radiant} onAdd={() => setPicker('radiant')} onRemove={(id) => remove('radiant', id)} />
        <SideColumn title="Dire" accent={colors.enemy} heroIds={dire} onAdd={() => setPicker('dire')} onRemove={(id) => remove('dire', id)} />
      </View>

      {/* Breakdown */}
      {!prediction.incomplete && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(3), gap: spacing(2) }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Por qué (perspectiva Radiant)</Text>
          <Factor label="Ventaja de matchups" value={prediction.breakdown.matchupEdge} />
          <Factor label="Meta (win rate)" value={prediction.breakdown.metaEdge} />
          <Factor label="Composición" value={prediction.breakdown.compEdge} />
          <TimingFactor value={prediction.breakdown.timingEdge} />
        </View>
      )}

      {/* Key matchups */}
      {prediction.keyMatchups.length > 0 && (
        <View style={{ gap: spacing(2) }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Matchups clave</Text>
          {prediction.keyMatchups.map((k) => {
            const hero = getHero(k.heroId);
            const vs = getHero(k.vsHeroId);
            const tone = k.side === 'radiant' ? colors.ally : colors.enemy;
            return (
              <View key={`${k.heroId}-${k.vsHeroId}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <HeroImage heroId={k.heroId} size={36} />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>vs</Text>
                <HeroImage heroId={k.vsHeroId} size={36} />
                <Text style={{ color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                  {hero?.localizedName} gana a {vs?.localizedName}
                </Text>
                <Text style={{ color: tone, fontWeight: '700', fontSize: 12 }}>{(k.winrate * 100).toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Educational report */}
      {!prediction.incomplete && (
        <Pressable
          onPress={() => setShowReport((v) => !v)}
          style={({ pressed }) => ({ paddingVertical: spacing(3), borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral, alignItems: 'center', backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })}
        >
          <Text style={{ color: colors.neutral, fontWeight: '800' }}>
            {showReport ? 'Ocultar análisis' : '🔍 Analizar por qué gana + cómo mejorar'}
          </Text>
        </Pressable>
      )}

      {showReport && !prediction.incomplete && <DraftReportView radiant={radiant} dire={dire} />}

      <Pressable
        onPress={() => { setRadiant([]); setDire([]); setShowReport(false); }}
        style={({ pressed }) => ({ alignSelf: 'flex-start', paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, backgroundColor: pressed ? colors.accent : 'transparent' })}
      >
        <Text style={{ color: colors.text, fontWeight: '700' }}>Reiniciar simulación</Text>
      </Pressable>

      <HeroPicker
        visible={picker !== null}
        title={picker === 'radiant' ? 'Radiant' : 'Dire'}
        excluded={used}
        remaining={picker ? 5 - (picker === 'radiant' ? radiant.length : dire.length) : 0}
        onSelect={(id) => picker && add(picker, id)}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

function SideColumn({
  title,
  accent,
  heroIds,
  onAdd,
  onRemove,
}: {
  title: string;
  accent: string;
  heroIds: number[];
  onAdd: () => void;
  onRemove: (id: number) => void;
}) {
  const rows = Array.from({ length: 5 }, (_, i) => heroIds[i]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: accent, fontWeight: '700', marginBottom: spacing(2) }}>{title} ({heroIds.length}/5)</Text>
      <View style={{ gap: spacing(2) }}>
        {rows.map((id, idx) =>
          id == null ? (
            <Pressable
              key={`e-${idx}`}
              onPress={onAdd}
              style={{ height: 40, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>＋</Text>
            </Pressable>
          ) : (
            <Pressable
              key={id}
              onPress={() => onRemove(id)}
              style={{ flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}
            >
              <HeroImage heroId={id} size={56} style={{ borderRadius: 0 }} />
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, flex: 1, marginLeft: spacing(2) }}>
                {getHero(id)?.localizedName ?? id}
              </Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

function Factor({ label, value }: { label: string; value: number }) {
  const pts = value * 100;
  const tone = value > 0 ? colors.positive : value < 0 ? colors.negative : colors.textMuted;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: tone, fontSize: 12, fontWeight: '700' }}>
        {pts >= 0 ? '+' : ''}{pts.toFixed(1)} (Radiant)
      </Text>
    </View>
  );
}

function TimingFactor({ value }: { value: number }) {
  // Unlike the other factors, a positive/negative sign here doesn't mean
  // "good/bad for Radiant" by itself — whether leaning early or late helps
  // depends on the learned coefficient, not the raw lean. Keep it neutral.
  const leaning =
    value > 0.05 ? 'Radiant más late' : value < -0.05 ? 'Dire más late' : 'Curvas parejas';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Timing (early/mid/late)</Text>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{leaning}</Text>
    </View>
  );
}
