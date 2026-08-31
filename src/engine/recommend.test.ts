import { describe, expect, it } from 'vitest';
import type { Dataset } from '../data/types';
import {
  counterAdvantage,
  missingCoreRoles,
  recommendHeroes,
  shrunkWinrate,
} from './recommend';
import { itemBuildFor } from './itemBuild';

// Minimal hand-built dataset so expectations are exact and independent of the
// generated sample file.
function makeDataset(): Dataset {
  return {
    patch: 'test',
    generatedAt: '2024-01-01T00:00:00.000Z',
    heroes: [
      { id: 1, name: 'npc_dota_hero_a', localizedName: 'Carry A', primaryAttr: 'agi', attackType: 'Melee', roles: ['Carry'], img: '', icon: '' },
      { id: 2, name: 'npc_dota_hero_b', localizedName: 'Support B', primaryAttr: 'int', attackType: 'Ranged', roles: ['Support', 'Disabler'], img: '', icon: '' },
      { id: 3, name: 'npc_dota_hero_c', localizedName: 'Initiator C', primaryAttr: 'str', attackType: 'Melee', roles: ['Initiator', 'Durable'], img: '', icon: '' },
      { id: 4, name: 'npc_dota_hero_d', localizedName: 'Nuker D', primaryAttr: 'int', attackType: 'Ranged', roles: ['Nuker'], img: '', icon: '' },
    ],
    stats: [
      { heroId: 1, byBracket: { legend: { pick: 100000, win: 55000 } }, proPick: 0, proWin: 0, proBan: 0 },
      { heroId: 2, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
      { heroId: 3, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
      { heroId: 4, byBracket: { legend: { pick: 100000, win: 48000 } }, proPick: 0, proWin: 0, proBan: 0 },
    ],
    matchups: {
      1: [{ heroId: 9, gamesPlayed: 100000, wins: 70000 }], // strong vs enemy 9
      2: [{ heroId: 9, gamesPlayed: 100000, wins: 50000 }],
      3: [{ heroId: 9, gamesPlayed: 100000, wins: 50000 }],
      4: [{ heroId: 9, gamesPlayed: 100000, wins: 50000 }],
    },
    itemPopularity: {
      1: {
        start: [
          { itemId: 40, key: 'tango', count: 100 },
          { itemId: 11, key: 'quelling_blade', count: 80 },
        ],
        early: [{ itemId: 63, key: 'power_treads', count: 90 }],
        mid: [{ itemId: 145, key: 'bfury', count: 70 }],
        late: [{ itemId: 160, key: 'butterfly', count: 60 }],
      },
    },
    itemConstants: {
      40: { id: 40, key: 'tango', localizedName: 'Tango' },
      11: { id: 11, key: 'quelling_blade', localizedName: 'Quelling Blade' },
      63: { id: 63, key: 'power_treads', localizedName: 'Power Treads' },
      145: { id: 145, key: 'bfury', localizedName: 'Battle Fury' },
      160: { id: 160, key: 'butterfly', localizedName: 'Butterfly' },
    },
  };
}

describe('shrunkWinrate', () => {
  it('returns the prior for zero games', () => {
    expect(shrunkWinrate(0, 0)).toBe(0.5);
  });

  it('pulls small samples toward the prior', () => {
    // 3/3 raw = 100%, but with the prior it should be well below 1.
    const wr = shrunkWinrate(3, 3);
    expect(wr).toBeGreaterThan(0.5);
    expect(wr).toBeLessThan(0.6);
  });

  it('barely moves large samples', () => {
    const wr = shrunkWinrate(55000, 100000);
    expect(wr).toBeGreaterThan(0.549);
    expect(wr).toBeLessThan(0.551);
  });
});

describe('counterAdvantage', () => {
  it('is 0 with no enemies', () => {
    expect(counterAdvantage(makeDataset(), 1, [])).toBe(0);
  });

  it('reflects a favorable matchup', () => {
    // Hero 1 wins 70% vs enemy 9 -> advantage ~ +0.2.
    const adv = counterAdvantage(makeDataset(), 1, [9]);
    expect(adv).toBeGreaterThan(0.19);
    expect(adv).toBeLessThan(0.2);
  });

  it('is 0 when matchup data is missing', () => {
    expect(counterAdvantage(makeDataset(), 2, [1234])).toBe(0);
  });
});

describe('missingCoreRoles', () => {
  it('lists all core roles for an empty team', () => {
    expect(missingCoreRoles(makeDataset(), []).sort()).toEqual(
      ['Carry', 'Disabler', 'Durable', 'Initiator', 'Nuker', 'Support'].sort(),
    );
  });

  it('excludes roles already covered', () => {
    const missing = missingCoreRoles(makeDataset(), [1]); // Carry A
    expect(missing).not.toContain('Carry');
    expect(missing).toContain('Support');
  });
});

describe('recommendHeroes', () => {
  it('excludes picked, enemy and banned heroes', () => {
    const recs = recommendHeroes(makeDataset(), { myTeam: [1], enemy: [2], bans: [3] });
    const ids = recs.map((r) => r.heroId);
    expect(ids).toEqual([4]);
  });

  it('ranks the enemy-countering hero first', () => {
    // Enemy has hero 9. Only hero 1 counters it hard, so it should top the list.
    const recs = recommendHeroes(makeDataset(), { myTeam: [], enemy: [9], bans: [] });
    expect(recs[0].heroId).toBe(1);
    expect(recs[0].breakdown.counterAdvantage).toBeGreaterThan(0);
  });

  it('rewards filling a missing role', () => {
    // Team already has the Carry (hero 1). Hero 2 (Support/Disabler) should
    // score its roleFit for the still-missing Support role.
    const recs = recommendHeroes(makeDataset(), { myTeam: [1], enemy: [], bans: [] });
    const hero2 = recs.find((r) => r.heroId === 2)!;
    expect(hero2.coveredMissingRoles).toContain('Support');
    expect(hero2.breakdown.roleFit).toBeGreaterThan(0);
  });

  it('respects the limit option', () => {
    const recs = recommendHeroes(makeDataset(), { myTeam: [], enemy: [], bans: [] }, { limit: 2 });
    expect(recs).toHaveLength(2);
  });
});

describe('itemBuildFor', () => {
  it('returns null for a hero with no item data', () => {
    expect(itemBuildFor(makeDataset(), 2)).toBeNull();
  });

  it('resolves item names and shares, sorted by count', () => {
    const build = itemBuildFor(makeDataset(), 1)!;
    expect(build.start[0].name).toBe('Tango');
    expect(build.start[0].count).toBe(100);
    // shares within a phase sum to 1.
    const total = build.start.reduce((s, i) => s + i.share, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
