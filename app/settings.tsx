import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius, spacing } from '../src/theme';
import { useDraftStore } from '../src/store/draftStore';
import { DEFAULT_WEIGHTS, type Weights } from '../src/engine';

const LABELS: Record<keyof Weights, { title: string; help: string }> = {
  meta: { title: 'Meta (win rate)', help: 'Cuánto pesa el win rate del héroe en el bracket elegido.' },
  counter: { title: 'Counter', help: 'Cuánto pesa contrarrestar a los héroes del equipo enemigo.' },
  role: { title: 'Rol faltante', help: 'Cuánto pesa cubrir roles que a tu equipo le faltan.' },
};

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const step = 0.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
      <Btn label="−" onPress={() => onChange(Math.max(0, +(value - step).toFixed(1)))} />
      <Text style={{ color: colors.text, fontWeight: '800', width: 40, textAlign: 'center' }}>
        {value.toFixed(1)}
      </Text>
      <Btn label="＋" onPress={() => onChange(+(value + step).toFixed(1))} />
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.accent : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const weights = useDraftStore((s) => s.weights);
  const setWeights = useDraftStore((s) => s.setWeights);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Pesos del recomendador</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        La puntuación de cada héroe es una suma ponderada de tres señales, todas derivadas
        directamente de datos de OpenDota. Ajusta cuánto pesa cada una.
      </Text>

      {(Object.keys(LABELS) as (keyof Weights)[]).map((key) => (
        <View
          key={key}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing(3),
            gap: spacing(2),
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{LABELS[key].title}</Text>
            <Stepper value={weights[key]} onChange={(v) => setWeights({ [key]: v } as Partial<Weights>)} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{LABELS[key].help}</Text>
        </View>
      ))}

      <Pressable
        onPress={() => setWeights({ ...DEFAULT_WEIGHTS })}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(2.5),
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent,
          backgroundColor: pressed ? colors.accent : 'transparent',
        })}
      >
        <Text style={{ color: colors.text, fontWeight: '700' }}>Restaurar valores por defecto</Text>
      </Pressable>

      <Text style={{ color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: spacing(2) }}>
        Nota: la sinergia entre héroes aliados (dúos que combinan bien) no está disponible como
        endpoint directo en OpenDota; en este MVP se aproxima por complementariedad de roles.
      </Text>
    </ScrollView>
  );
}
