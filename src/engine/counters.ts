// Transparent counter analysis: which heroes beat a given line-up, and why.
// Pure and testable; no UI imports.

import type { Dataset, Matchup } from '../data/types';
import { shrunkWinrate } from './recommend';

export interface CounterCell {
  enemyId: number;
  /** Shrunk win rate of the hero vs this enemy. */
  winrate: number;
  /** winrate - 0.5. Positive = favorable. */
  advantage: number;
  gamesPlayed: number;
  /** True when this hero has no matchup row vs the enemy. */
  missing: boolean;
}

export interface CounterEntry {
  heroId: number;
  /** Average advantage across the enemy line-up. */
  avgAdvantage: number;
  /** Per-enemy detail so the UI can explain the number. */
  perEnemy: CounterCell[];
}

function matchupIndex(rows: Matchup[]): Map<number, Matchup> {
  const map = new Map<number, Matchup>();
  for (const m of rows) map.set(m.heroId, m);
  return map;
}

/** Per-enemy matchup detail for a single hero. */
export function counterBreakdown(
  dataset: Dataset,
  heroId: number,
  enemy: number[],
): CounterCell[] {
  const idx = matchupIndex(dataset.matchups[heroId] ?? []);
  return enemy.map((enemyId) => {
    const m = idx.get(enemyId);
    if (!m) {
      return { enemyId, winrate: 0.5, advantage: 0, gamesPlayed: 0, missing: true };
    }
    const winrate = shrunkWinrate(m.wins, m.gamesPlayed);
    return { enemyId, winrate, advantage: winrate - 0.5, gamesPlayed: m.gamesPlayed, missing: false };
  });
}

export interface TopCountersOptions {
  limit?: number;
  /** Hero ids to exclude (already picked / banned). */
  exclude?: Iterable<number>;
}

/**
 * Rank every available hero by how hard it counters the enemy line-up.
 * Returns the full per-enemy breakdown for transparency.
 */
export function topCountersAgainst(
  dataset: Dataset,
  enemy: number[],
  options: TopCountersOptions = {},
): CounterEntry[] {
  const excluded = new Set<number>(options.exclude ?? []);
  const entries: CounterEntry[] = [];

  for (const hero of dataset.heroes) {
    if (excluded.has(hero.id) || enemy.includes(hero.id)) continue;

    const perEnemy = counterBreakdown(dataset, hero.id, enemy);
    const counted = perEnemy.filter((c) => !c.missing);
    const avgAdvantage =
      counted.length === 0 ? 0 : counted.reduce((s, c) => s + c.advantage, 0) / counted.length;

    entries.push({ heroId: hero.id, avgAdvantage, perEnemy });
  }

  entries.sort((a, b) => b.avgAdvantage - a.avgAdvantage || a.heroId - b.heroId);
  return typeof options.limit === 'number' ? entries.slice(0, options.limit) : entries;
}
