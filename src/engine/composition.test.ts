import { describe, expect, it } from 'vitest';
import type { HeroAttributes } from '../data/heroAttributes';
import {
  analyzeComposition,
  compositionBonus,
  needsCoveredBy,
  teamProfile,
} from './composition';

const base: HeroAttributes = {
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
};

const physicalCarry: HeroAttributes = { ...base, damageTypes: ['physical'], waveclear: true };
const magicInitiator: HeroAttributes = {
  ...base,
  damageTypes: ['magical'],
  hardDisable: true,
  initiation: true,
  teamfight: true,
};

describe('needsCoveredBy', () => {
  it('maps attributes to needs', () => {
    const needs = needsCoveredBy(magicInitiator);
    expect(needs.has('disable')).toBe(true);
    expect(needs.has('initiation')).toBe(true);
    expect(needs.has('teamfight')).toBe(true);
    expect(needs.has('magical')).toBe(true);
    expect(needs.has('physical')).toBe(false);
  });
});

describe('teamProfile', () => {
  it('reports gaps for a one-dimensional team', () => {
    const profile = teamProfile([physicalCarry]);
    expect(profile.covered.has('physical')).toBe(true);
    expect(profile.covered.has('waveclear')).toBe(true);
    expect(profile.gaps).toContain('magical');
    expect(profile.gaps).toContain('disable');
    expect(profile.damageMix.physical).toBe(1);
    expect(profile.damageMix.magical).toBe(0);
  });
});

describe('analyzeComposition', () => {
  const attrs: Record<number, HeroAttributes> = { 1: physicalCarry, 2: magicInitiator, 9: magicInitiator };
  const attrsFor = (id: number) => attrs[id] ?? base;

  it('produces no warnings for an empty team', () => {
    const report = analyzeComposition([], [], attrsFor);
    expect(report.warnings).toEqual([]);
  });

  it('warns about missing magic damage on an all-physical team', () => {
    const report = analyzeComposition([1], [], attrsFor);
    expect(report.warnings.some((w) => w.includes('físico'))).toBe(true);
  });

  it('flags a mostly-magical enemy as a magic threat', () => {
    const report = analyzeComposition([1], [2, 9], attrsFor);
    expect(report.enemyThreat.some((n) => n.toLowerCase().includes('mágico'))).toBe(true);
  });
});

describe('compositionBonus', () => {
  it('is 0 when there are no gaps', () => {
    expect(compositionBonus(magicInitiator, [])).toBe(0);
  });

  it('rewards closing gaps', () => {
    // Team of one physical carry lacks magical/disable/initiation/teamfight/save.
    const gaps = teamProfile([physicalCarry]).gaps;
    const bonus = compositionBonus(magicInitiator, gaps);
    expect(bonus).toBeGreaterThan(0);
    // The initiator does NOT provide save, so it can't be a perfect 1.
    expect(bonus).toBeLessThan(1);
  });
});
