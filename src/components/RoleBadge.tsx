import { Text, View } from 'react-native';
import { colors, radius, roleColors } from '../theme';

export function RoleBadge({ role, highlight = false }: { role: string; highlight?: boolean }) {
  const tint = roleColors[role] ?? colors.textMuted;
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radius.sm,
        backgroundColor: highlight ? tint : 'transparent',
        borderWidth: 1,
        borderColor: tint,
      }}
    >
      <Text
        style={{
          color: highlight ? colors.bg : tint,
          fontSize: 11,
          fontWeight: '600',
        }}
      >
        {role}
      </Text>
    </View>
  );
}
