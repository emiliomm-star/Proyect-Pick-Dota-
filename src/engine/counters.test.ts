import { describe, expect, it } from 'vitest';
import type { Dataset } from '../data/types';
import { counterBreakdown, topCountersAgainst } from './counters';
import { recommendBans } from './bans';

function makeDataset(): Dataset {
  return {
    patch: 'test',
    generatedAt: '2024-01-01T00:00:00.000Z',
    heroes: [
      { id: 1, name: 'h1', localizedName: 'Strong Counter', primaryAttr: 'agi', attackType: 'Melee', roles: ['Carry'], img: '', icon: '' },
      { id: 2, name: 'h2', localizedName: 'Weak', primaryAttr: 'int', attackType: 'Ranged', roles: ['Support'], img: '', icon: '' },
      { id: 3, name: 'h3', localizedName: 'Neutral', primaryAttr: 'str', attackType: 'Melee', roles: ['Durable'], img: '', icon: '' },
    ],
    stats: [
      { heroId: 1, byBracket: { legend: { pick: 100000, win: 52000 } }, proPick: 0, proWin: 0, proBan: 100 },
      { heroId: 2, byBracket: { legend: { pick: 100000, win: 49000 } }, proPick: 0, proWin: 0, proBan: 10 },
      { heroId: 3, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
    ],
    matchups: {
      1: [{ heroId: 9, gamesPlayed: 100000, wins: 65000 }], // beats enemy 9
      2: [{ heroId: 9, gamesPlayed: 100000, wins: 45000 }], // loses to enemy 9
      3: [{ heroId: 9, gamesPlayed: 100000, wins: 50000 }],
    },
    itemPopularity: {},
    itemConstants: {},
  };
}

describe('counterBreakdown', () => {
  it('marks missing matchups', () => {
    const cells = counterBreakdown(makeDataset(), 1, [9, 999]);
    expect(cells.find((c) => c.enemyId === 9)!.missing).toBe(false);
    expect(cells.find((c) => c.enemyId === 999)!.missing).toBe(true);
  });

  it('computes advantage as winrate - 0.5', () => {
    const cell = counterBreakdown(makeDataset(), 1, [9])[0];
    expect(cell.advantage).toBeGreaterThan(0.1); // ~+0.15
  });
});

describe('topCountersAgainst', () => {
  it('ranks the hardest counter first', () => {
    const ranked = topCountersAgainst(makeDataset(), [9]);
    expect(ranked[0].heroId).toBe(1);
    expect(ranked[0].avgAdvantage).toBeGreaterThan(0);
  });

  it('honors exclude and limit', () => {
    const ranked = topCountersAgainst(makeDataset(), [9], { exclude: [1], limit: 1 });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].heroId).not.toBe(1);
  });
});

describe('recommendBans', () => {
  it('excludes already-used heroes', () => {
    const bans = recommendBans(makeDataset(), { myTeam: [1], enemy: [], bans: [2] });
    const ids = bans.map((b) => b.heroId);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(2);
  });

  it('prioritizes heroes that threaten your team', () => {
    // Your team has hero 9-killer? Use enemy-perspective: candidate 1 beats hero 9.
    // Put hero 9 on your team so candidate 1 (65% vs 9) is a big threat to ban.
    const ds = makeDataset();
    ds.heroes.push({ id: 9, name: 'h9', localizedName: 'Ally Nine', primaryAttr: 'agi', attackType: 'Melee', roles: ['Carry'], img: '', icon: '' });
    ds.stats.push({ heroId: 9, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 });
    const bans = recommendBans(ds, { myTeam: [9], enemy: [], bans: [] });
    expect(bans[0].heroId).toBe(1);
    expect(bans[0].breakdown.threatToMyTeam).toBeGreaterThan(0);
  });
});
