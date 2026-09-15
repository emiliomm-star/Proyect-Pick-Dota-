import { describe, expect, it } from 'vitest';
import {
  applyChoice,
  CAPTAINS_SEQUENCE,
  currentStep,
  initialCaptainsState,
  isComplete,
  remainingMs,
  RESERVE_SECONDS,
  skipStep,
  STEP_SECONDS,
  usedHeroes,
} from './captainsMode';

describe('CAPTAINS_SEQUENCE', () => {
  it('gives each side 5 picks and 5 bans', () => {
    const count = (team: string, action: string) =>
      CAPTAINS_SEQUENCE.filter((s) => s.team === team && s.action === action).length;
    expect(count('radiant', 'pick')).toBe(5);
    expect(count('dire', 'pick')).toBe(5);
    expect(count('radiant', 'ban')).toBe(5);
    expect(count('dire', 'ban')).toBe(5);
  });
});

describe('applyChoice', () => {
  it('routes picks and bans to the right buckets and advances', () => {
    let state = initialCaptainsState();
    const first = currentStep(state)!;
    expect(first).toEqual({ team: 'radiant', action: 'ban' });

    state = applyChoice(state, 10);
    expect(state.radiantBans).toEqual([10]);
    expect(state.stepIndex).toBe(1);
  });

  it('refuses to reuse a hero', () => {
    let state = initialCaptainsState();
    state = applyChoice(state, 10); // radiant ban
    const before = state;
    const after = applyChoice(state, 10); // same hero again
    expect(after).toBe(before); // no-op returns same reference
  });

  it('restarts the step clock when advancing', () => {
    const t0 = 1_000_000;
    let state = initialCaptainsState(t0);
    expect(state.stepStartedAt).toBe(t0);
    const t1 = t0 + 5000; // within base time -> no reserve spent
    state = applyChoice(state, 10, t1);
    expect(state.stepStartedAt).toBe(t1);
    expect(state.radiantReserveMs).toBe(RESERVE_SECONDS * 1000);
  });

  it('completes after the full sequence with 5 picks per side', () => {
    let state = initialCaptainsState();
    let hero = 1;
    while (!isComplete(state)) {
      // pick any unused hero id
      while (usedHeroes(state).has(hero)) hero += 1;
      state = applyChoice(state, hero);
    }
    expect(isComplete(state)).toBe(true);
    expect(state.radiantPicks).toHaveLength(5);
    expect(state.direPicks).toHaveLength(5);
    expect(currentStep(state)).toBeNull();
  });
});

describe('skipStep', () => {
  it('advances without adding any hero', () => {
    const state = initialCaptainsState(0);
    const after = skipStep(state, 1000);
    expect(after.stepIndex).toBe(1);
    expect(after.radiantBans).toHaveLength(0);
    expect(after.radiantPicks).toHaveLength(0);
    expect(after.stepStartedAt).toBe(1000);
  });
});

describe('reserve time bank', () => {
  const t0 = 1_000_000;

  it('counts base + reserve as the hard deadline', () => {
    const state = initialCaptainsState(t0);
    // base (30s) + reserve (130s) = 160s
    expect(remainingMs(state, t0)).toBe((STEP_SECONDS + RESERVE_SECONDS) * 1000);
  });

  it('does not drain reserve if you act within base time', () => {
    let state = initialCaptainsState(t0);
    state = applyChoice(state, 10, t0 + 10_000); // 10s < 30s base
    expect(state.radiantReserveMs).toBe(RESERVE_SECONDS * 1000);
  });

  it('drains reserve for time spent beyond base', () => {
    let state = initialCaptainsState(t0);
    // Radiant takes 50s: 30s base + 20s over -> 20s off the reserve.
    state = applyChoice(state, 10, t0 + 50_000);
    expect(state.radiantReserveMs).toBe(RESERVE_SECONDS * 1000 - 20_000);
    expect(state.direReserveMs).toBe(RESERVE_SECONDS * 1000); // dire untouched
  });

  it('caps reserve at 0 and never negative', () => {
    let state = initialCaptainsState(t0);
    state = applyChoice(state, 10, t0 + 10_000_000); // way over
    expect(state.radiantReserveMs).toBe(0);
    expect(remainingMs(state, state.stepStartedAt)).toBeGreaterThan(0); // next team fresh
  });
});
