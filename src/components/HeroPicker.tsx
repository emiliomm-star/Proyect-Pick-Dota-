import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { attrColors, attrLabels, colors, radius, spacing } from '../theme';
import { heroesSorted } from '../data/dataset';
import { filterAndRankHeroes } from '../data/heroSearch';
import type { Hero } from '../data/types';
import { HeroImage } from './HeroImage';

const ATTR_ORDER: (keyof typeof attrLabels)[] = ['str', 'agi', 'int', 'all'];

export interface PickedGroup {
  label: string;
  color: string;
  heroIds: number[];
}

interface Props {
  visible: boolean;
  title: string;
  /** Hero ids that cannot be picked (already used). */
  excluded: Set<number>;
  /** How many more heroes fit in the target. The picker auto-closes at 0. */
  remaining: number;
  onSelect: (heroId: number) => void;
  onClose: () => void;
  /**
   * Already-picked/banned heroes, shown as a compact strip above the grid so
   * captains can see the full draft state without closing the panel.
   */
  groups?: PickedGroup[];
}

export function HeroPicker({ visible, title, excluded, remaining, onSelect, onClose, groups }: Props) {
  const [query, setQuery] = useState('');

  const available = useMemo<Hero[]>(
    () => heroesSorted.filter((h) => !excluded.has(h.id)),
    [excluded],
  );

  const ranked = useMemo(() => filterAndRankHeroes(available, query), [available, query]);
  const topMatchId = query.trim() !== '' && ranked.length > 0 ? ranked[0].id : null;

  const sections = useMemo(() => {
    const byAttr = new Map<string, Hero[]>();
    for (const h of ranked) {
      const list = byAttr.get(h.primaryAttr) ?? [];
      list.push(h);
      byAttr.set(h.primaryAttr, list);
    }
    return ATTR_ORDER.map((attr) => ({ attr, heroes: byAttr.get(attr) ?? [] })).filter(
      (s) => s.heroes.length > 0,
    );
  }, [ranked]);

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

  const visibleGroups = groups?.filter((g) => g.heroIds.length > 0) ?? [];

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
            maxHeight: '88%',
            minHeight: '55%',
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
            placeholder="Buscar héroe…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoFocus
            blurOnSubmit={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (topMatchId != null) pick(topMatchId);
            }}
            style={{
              marginTop: spacing(3),
              backgroundColor: colors.surfaceAlt,
              color: colors.text,
              borderRadius: radius.md,
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(2.5),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />

          {/* Already picked/banned — always visible, no need to close the panel. */}
          {visibleGroups.length > 0 && (
            <View
              style={{
                marginTop: spacing(3),
                paddingBottom: spacing(2),
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: spacing(1.5),
              }}
            >
              {visibleGroups.map((g) => (
                <View key={g.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                  <Text style={{ color: g.color, fontSize: 11, fontWeight: '700', width: 64 }}>
                    {g.label}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                    {g.heroIds.map((id) => (
                      <HeroImage key={id} heroId={id} size={28} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <ScrollView
            style={{ flex: 1, marginTop: spacing(2) }}
            contentContainerStyle={{ paddingBottom: spacing(8) }}
            keyboardShouldPersistTaps="handled"
          >
            {sections.length === 0 ? (
              <Text style={{ color: colors.textMuted, paddingVertical: spacing(6), textAlign: 'center' }}>
                Sin resultados
              </Text>
            ) : (
              sections.map(({ attr, heroes }) => (
                <View key={attr} style={{ marginBottom: spacing(3) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing(2) }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: attrColors[attr] }} />
                    <Text style={{ color: attrColors[attr], fontWeight: '700', fontSize: 12 }}>
                      {attrLabels[attr]}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>({heroes.length})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                    {heroes.map((h) => {
                      const isTop = h.id === topMatchId;
                      return (
                        <Pressable
                          key={h.id}
                          onPress={() => pick(h.id)}
                          style={({ pressed }) => ({
                            width: 72,
                            alignItems: 'center',
                            padding: 4,
                            borderRadius: radius.sm,
                            borderWidth: isTop ? 1 : 0,
                            borderColor: colors.accent,
                            backgroundColor: pressed ? colors.surfaceAlt : isTop ? 'rgba(194,60,42,0.12)' : 'transparent',
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <HeroImage heroId={h.id} size={64} />
                          <Text
                            numberOfLines={1}
                            style={{ color: colors.text, fontSize: 10, marginTop: 4, textAlign: 'center' }}
                          >
                            {h.localizedName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
