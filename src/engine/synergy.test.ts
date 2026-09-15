import { describe, expect, it } from 'vitest';
import type { HeroAttributes } from '../data/heroAttributes';
import { teamSynergy } from './synergy';

const attr = (o: Partial<HeroAttributes>): HeroAttributes => ({
  damageTypes: ['physical'],
  hardDisable: false,
  initiation: false,
  teamfight: false,
  waveclear: false,
  sustain: false,
  save: false,
  escape: false,
  powerSpike: 'mid',
  durable: false,
  ...o,
});

describe('teamSynergy', () => {
  it('scores 0 for a team with none of the rules', () => {
    const s = teamSynergy([attr({}), attr({})]);
    expect(s.score).toBe(0);
    expect(s.breakdown).toEqual({
      disableChain: false,
      saveForVulnerableCore: false,
      multipleThreats: false,
    });
  });

  it('detects a disable chain with 2+ hard-disable heroes', () => {
    const s = teamSynergy([attr({ hardDisable: true }), attr({ hardDisable: true }), attr({})]);
    expect(s.breakdown.disableChain).toBe(true);
  });

  it('does not flag a disable chain with only 1 disabler', () => {
    const s = teamSynergy([attr({ hardDisable: true }), attr({})]);
    expect(s.breakdown.disableChain).toBe(false);
  });

  it('detects a save protecting a vulnerable (squishy, escape-less) core', () => {
    const s = teamSynergy([attr({ save: true }), attr({ escape: false, durable: false })]);
    expect(s.breakdown.saveForVulnerableCore).toBe(true);
  });

  it('does not flag save synergy without a vulnerable core (durable or has escape)', () => {
    const s = teamSynergy([attr({ save: true }), attr({ durable: true })]);
    expect(s.breakdown.saveForVulnerableCore).toBe(false);
    const s2 = teamSynergy([attr({ save: true }), attr({ escape: true })]);
    expect(s2.breakdown.saveForVulnerableCore).toBe(false);
  });

  it('detects multiple teamfight threats', () => {
    const s = teamSynergy([attr({ teamfight: true }), attr({ teamfight: true })]);
    expect(s.breakdown.multipleThreats).toBe(true);
  });

  it('scores 1 when all three rules are satisfied', () => {
    const s = teamSynergy([
      attr({ hardDisable: true, teamfight: true }),
      attr({ hardDisable: true, teamfight: true }),
      attr({ save: true }),
      attr({ escape: false, durable: false }),
    ]);
    expect(s.score).toBe(1);
  });

  it('handles an empty team', () => {
    const s = teamSynergy([]);
    expect(s.score).toBe(0);
  });
});
