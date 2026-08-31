import { useState } from 'react';
import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { getHero } from '../data/dataset';

interface Props {
  heroId: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Hero portrait with a graceful fallback (initials) if the image fails. */
export function HeroImage({ heroId, size = 48, style }: Props) {
  const hero = getHero(heroId);
  const [failed, setFailed] = useState(false);

  const box: StyleProp<ViewStyle> = [
    {
      width: size,
      height: size * (0.72 / 1),
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    style,
  ];

  if (!hero || failed || !hero.img) {
    const initials = hero?.localizedName
      ? hero.localizedName.split(' ').map((w) => w[0]).slice(0, 2).join('')
      : '?';
    return (
      <View style={box}>
        <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: size * 0.28 }}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View style={box}>
      <Image
        source={{ uri: hero.img }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
}
