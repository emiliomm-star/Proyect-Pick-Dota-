import { describe, expect, it } from 'vitest';
import {
  applyChoice,
  CAPTAINS_SEQUENCE,
  currentStep,
  initialCaptainsState,
  isComplete,
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
