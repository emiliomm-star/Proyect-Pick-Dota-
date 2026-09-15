import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../theme';
import {
  baseDeadline,
  liveReserveMs,
  RESERVE_SECONDS,
  STEP_SECONDS,
  stepDeadline,
  type CaptainsState,
} from '../engine';

interface Props {
  state: CaptainsState;
  /** When true, this client enforces the timeout (calls onExpire). */
  active: boolean;
  /** Called once when base + reserve reach 0 (only if active). */
  onExpire?: () => void;
}

/** Captains-Mode-style countdown: base time first, then the reserve bank. */
export function TurnTimer({ state, active, onExpire }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const hard = stepDeadline(state);
  const base = baseDeadline(state);
  const inReserve = now >= base;
  const remaining = Math.max(0, hard - now);

  const phaseSecs = inReserve
    ? Math.ceil(remaining / 1000)
    : Math.ceil(Math.max(0, base - now) / 1000);
  const reserveSecs = Math.ceil(liveReserveMs(state, now) / 1000);

  const pct = inReserve
    ? Math.max(0, Math.min(1, remaining / (RESERVE_SECONDS * 1000)))
    : Math.max(0, Math.min(1, Math.max(0, base - now) / (STEP_SECONDS * 1000)));

  useEffect(() => {
    if (active && remaining <= 0 && firedFor.current !== hard) {
      firedFor.current = hard;
      onExpire?.();
    }
  }, [active, remaining, hard, onExpire]);

  const tint = inReserve ? colors.negative : phaseSecs <= 10 ? colors.neutral : colors.positive;

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ color: inReserve ? colors.negative : colors.textMuted, fontSize: 11, fontWeight: inReserve ? '700' : '400' }}>
          {inReserve ? 'RESERVA' : 'Tiempo'}
        </Text>
        <Text style={{ color: tint, fontSize: 16, fontWeight: '800' }}>{phaseSecs}s</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: tint }} />
      </View>
      {!inReserve && (
        <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'right' }}>
          Reserva: {reserveSecs}s
        </Text>
      )}
    </View>
  );
}
