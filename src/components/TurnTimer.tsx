import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { STEP_SECONDS } from '../engine';

interface Props {
  /** Epoch ms when the current step expires. */
  deadline: number;
  /** When true, this client enforces the timeout (calls onExpire). */
  active: boolean;
  /** Called once when the countdown reaches 0 (only if active). */
  onExpire?: () => void;
}

/** Captains-Mode-style countdown for the current pick/ban. */
export function TurnTimer({ deadline, active, onExpire }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, deadline - now);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(1, remaining / (STEP_SECONDS * 1000)));
  const danger = seconds <= 5;

  useEffect(() => {
    if (active && remaining <= 0 && firedFor.current !== deadline) {
      firedFor.current = deadline;
      onExpire?.();
    }
  }, [active, remaining, deadline, onExpire]);

  const tint = danger ? colors.negative : seconds <= 10 ? colors.neutral : colors.positive;

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Tiempo</Text>
        <Text style={{ color: tint, fontSize: 16, fontWeight: '800' }}>{seconds}s</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: tint }} />
      </View>
    </View>
  );
}
