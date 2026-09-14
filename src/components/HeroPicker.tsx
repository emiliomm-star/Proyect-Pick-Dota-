import { useEffect, useMemo, useState } from 'react';
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
  /** How many more heroes fit in the target. The picker auto-closes at 0. */
  remaining: number;
  onSelect: (heroId: number) => void;
  onClose: () => void;
}

export function HeroPicker({ visible, title, excluded, remaining, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const results = useMemo<Hero[]>(() => {
    const q = query.trim().toLowerCase();
    return heroesSorted.filter(
      (h) => !excluded.has(h.id) && (q === '' || h.localizedName.toLowerCase().includes(q)),
    );
  }, [query, excluded]);

  // Auto-close once the target is full (e.g. all 5 enemy slots picked).
  useEffect(() => {
    if (visible && remaining <= 0) onClose();
  }, [visible, remaining, onClose]);

  // Reset the query whenever the picker is (re)opened.
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const pick = (heroId: number) => {
    onSelect(heroId);
    setQuery(''); // keep the picker open for rapid multi-add
  };

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
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing(2) }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
              {remaining > 0 && remaining < 90 && (
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>faltan {remaining}</Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: colors.textMuted, fontSize: 16 }}>Listo ✓</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Escribe y pulsa Enter…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoFocus
            blurOnSubmit={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (results.length > 0) pick(results[0].id);
            }}
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
            renderItem={({ item, index }) => {
              const isFirst = index === 0 && query.trim() !== '';
              return (
                <Pressable
                  onPress={() => pick(item.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing(2),
                    paddingHorizontal: isFirst ? spacing(2) : 0,
                    borderRadius: radius.sm,
                    backgroundColor: isFirst ? colors.surfaceAlt : 'transparent',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <HeroImage heroId={item.id} size={54} />
                  <View style={{ marginLeft: spacing(3), flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                      {item.localizedName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {item.roles.slice(0, 3).join(' · ')}
                    </Text>
                  </View>
                  {isFirst && (
                    <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>↵ Enter</Text>
                  )}
                </Pressable>
              );
            }}
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
