import { describe, expect, it } from 'vitest';
import type { Dataset } from '../data/types';
import type { HeroAttributes } from '../data/heroAttributes';
import { draftReport } from './report';

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

function makeDataset(): Dataset {
  return {
    patch: 'test',
    generatedAt: '2024-01-01T00:00:00.000Z',
    heroes: [
      { id: 1, name: 'r1', localizedName: 'Rad One', primaryAttr: 'agi', attackType: 'Melee', roles: ['Carry'], img: '', icon: '' },
      { id: 2, name: 'd1', localizedName: 'Dire One', primaryAttr: 'int', attackType: 'Ranged', roles: ['Support'], img: '', icon: '' },
      { id: 3, name: 'x1', localizedName: 'Bench Mage', primaryAttr: 'int', attackType: 'Ranged', roles: ['Nuker'], img: '', icon: '' },
    ],
    stats: [
      { heroId: 1, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
      { heroId: 2, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
      { heroId: 3, byBracket: { legend: { pick: 100000, win: 50000 } }, proPick: 0, proWin: 0, proBan: 0 },
    ],
    matchups: {
      1: [{ heroId: 2, gamesPlayed: 100000, wins: 70000 }],
      2: [{ heroId: 1, gamesPlayed: 100000, wins: 30000 }, { heroId: 3, gamesPlayed: 100000, wins: 40000 }],
      3: [{ heroId: 2, gamesPlayed: 100000, wins: 60000 }],
    },
    itemPopularity: {},
    itemConstants: {},
  };
}

const attrsFor = (id: number): HeroAttributes => {
  const map: Record<number, HeroAttributes> = {
    1: attr({ damageTypes: ['physical'] }),
    2: attr({ damageTypes: ['magical'], hardDisable: true }),
    3: attr({ damageTypes: ['magical'], teamfight: true }),
  };
  return map[id] ?? attr({});
};

describe('draftReport', () => {
  it('identifies the winning side and explains why', () => {
    const report = draftReport(makeDataset(), [1], [2], { attributesFor: attrsFor });
    expect(report.winner).toBe('radiant');
    expect(report.winnerProb).toBeGreaterThan(0.5);
    expect(report.summary.length).toBeGreaterThan(0);
    expect(report.summary.join(' ')).toContain('enfrentamientos');
  });

  it('gives both sides strengths and weaknesses', () => {
    const report = draftReport(makeDataset(), [1], [2], { attributesFor: attrsFor });
    expect(report.radiant.strengths.length + report.radiant.weaknesses.length).toBeGreaterThan(0);
    expect(report.dire.strengths.length + report.dire.weaknesses.length).toBeGreaterThan(0);
    // Dire One is hard-countered by Rad One -> should show up as a dire weakness.
    expect(report.dire.weaknesses.join(' ')).toContain('sufre');
  });

  it('suggests an improvement swap for the winner when one helps', () => {
    // Radiant is [1]; swapping in hero 3 (also beats 2, 60%) may or may not help,
    // but the search must run without error and return null or a valid swap.
    const report = draftReport(makeDataset(), [1], [2], { attributesFor: attrsFor });
    if (report.winnerImprovement) {
      expect(report.winnerImprovement.winProbAfter).toBeGreaterThan(report.winnerImprovement.winProbBefore);
      expect(report.winnerImprovement.inHeroId).not.toBe(1);
    }
  });
});
