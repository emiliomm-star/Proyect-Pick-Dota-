import { describe, expect, it } from 'vitest';
import type { Dataset } from '../data/types';
import type { HeroAttributes } from '../data/heroAttributes';
import { draftFeatures, predictDraft } from './predict';

function makeDataset(): Dataset {
  return {
    patch: 'test',
    generatedAt: '2024-01-01T00:00:00.000Z',
    heroes: [
      { id: 1, name: 'r1', localizedName: 'Rad One', primaryAttr: 'agi', attackType: 'Melee', roles: ['Carry'], img: '', icon: '' },
      { id: 2, name: 'd1', localizedName: 'Dire One', primaryAttr: 'int', attackType: 'Ranged', roles: ['Support'], img: '', icon: '' },
    ],
    stats: [
      { heroId: 1, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
      { heroId: 2, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
    ],
    matchups: {
      1: [{ heroId: 2, gamesPlayed: 100000, wins: 70000 }], // hero 1 dominates hero 2
      2: [{ heroId: 1, gamesPlayed: 100000, wins: 30000 }],
    },
    itemPopularity: {},
    itemConstants: {},
  };
}

describe('predictDraft', () => {
  it('returns 50/50 and incomplete when a side is empty', () => {
    const p = predictDraft(makeDataset(), [1], []);
    expect(p.incomplete).toBe(true);
    expect(p.radiantWinProb).toBe(0.5);
  });

  it('favors the side with the dominant matchup', () => {
    const p = predictDraft(makeDataset(), [1], [2]);
    expect(p.incomplete).toBe(false);
    expect(p.radiantWinProb).toBeGreaterThan(0.5);
    expect(p.direWinProb).toBeCloseTo(1 - p.radiantWinProb, 6);
  });

  it('probabilities stay within (0,1)', () => {
    const p = predictDraft(makeDataset(), [1], [2]);
    expect(p.radiantWinProb).toBeGreaterThan(0);
    expect(p.radiantWinProb).toBeLessThan(1);
  });

  it('surfaces the key matchup on the favored side', () => {
    const p = predictDraft(makeDataset(), [1], [2]);
    expect(p.keyMatchups[0].side).toBe('radiant');
    expect(p.keyMatchups[0].heroId).toBe(1);
    expect(p.keyMatchups[0].advantage).toBeGreaterThan(0.1);
  });

  it('is symmetric: swapping sides mirrors the probability', () => {
    const ds = makeDataset();
    const a = predictDraft(ds, [1], [2]).radiantWinProb;
    const b = predictDraft(ds, [2], [1]).radiantWinProb;
    expect(a).toBeCloseTo(1 - b, 2);
  });

  it('timingEdge is 0 without attributesFor (feature stays inert)', () => {
    const p = predictDraft(makeDataset(), [1], [2]);
    expect(p.breakdown.timingEdge).toBe(0);
  });
});

const attr = (powerSpike: HeroAttributes['powerSpike']): HeroAttributes => ({
  damageTypes: ['physical'],
  hardDisable: false,
  initiation: false,
  teamfight: false,
  waveclear: false,
  sustain: false,
  save: false,
  escape: false,
  powerSpike,
  durable: false,
});

describe('draftFeatures timingEdge', () => {
  const ds = makeDataset();

  it('is positive when radiant leans later than dire', () => {
    const attrsFor = (id: number) => (id === 1 ? attr('late') : attr('early'));
    const f = draftFeatures(ds, [1], [2], { attributesFor: attrsFor });
    expect(f.timingEdge).toBeCloseTo(2, 5); // late(+1) - early(-1) = 2
  });

  it('is negative when radiant leans earlier than dire', () => {
    const attrsFor = (id: number) => (id === 1 ? attr('early') : attr('late'));
    const f = draftFeatures(ds, [1], [2], { attributesFor: attrsFor });
    expect(f.timingEdge).toBeCloseTo(-2, 5);
  });

  it('is 0 when both teams share the same lean', () => {
    const attrsFor = () => attr('mid');
    const f = draftFeatures(ds, [1], [2], { attributesFor: attrsFor });
    expect(f.timingEdge).toBe(0);
  });
});
