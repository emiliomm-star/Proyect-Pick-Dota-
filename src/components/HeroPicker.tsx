import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import { heroesSorted } from '../data/dataset';
import type { Hero } from '../data/types';
import { HeroImage } from './HeroImage';

interface Props {
  visible: boolean;
  title: string;
  /** Hero ids that cannot be picked (already used). */
  excluded: Set<number>;
  onSelect: (heroId: number) => void;
  onClose: () => void;
}

export function HeroPicker({ visible, title, excluded, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const results = useMemo<Hero[]>(() => {
    const q = query.trim().toLowerCase();
    return heroesSorted.filter(
      (h) => !excluded.has(h.id) && (q === '' || h.localizedName.toLowerCase().includes(q)),
    );
  }, [query, excluded]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingTop: spacing(4),
            paddingHorizontal: spacing(4),
            maxHeight: '82%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: colors.textMuted, fontSize: 16 }}>Cerrar ✕</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar héroe…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            style={{
              marginTop: spacing(3),
              marginBottom: spacing(2),
              backgroundColor: colors.surfaceAlt,
              color: colors.text,
              borderRadius: radius.md,
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(2.5),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />

          <FlatList
            data={results}
            keyExtractor={(h) => String(h.id)}
            keyboardShouldPersistTaps="handled"
            numColumns={1}
            contentContainerStyle={{ paddingBottom: spacing(8) }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.id);
                  setQuery('');
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing(2),
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <HeroImage heroId={item.id} size={54} />
                <View style={{ marginLeft: spacing(3) }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                    {item.localizedName}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {item.roles.slice(0, 3).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, paddingVertical: spacing(6), textAlign: 'center' }}>
                Sin resultados
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}
