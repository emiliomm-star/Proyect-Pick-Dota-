// Ban planner: which heroes are worth denying.
// Pure and testable; no UI imports.

import type { Bracket, Dataset, HeroStat } from '../data/types';
import { counterAdvantage, heroWinrate } from './recommend';

export interface BanWeights {
  /** Weight for the hero's raw win rate in the bracket. */
  meta: number;
  /** Weight for how hard the hero counters YOUR current team. */
  threat: number;
  /** Weight for how contested the hero is in pro play (ban rate). */
  pro: number;
}

export const DEFAULT_BAN_WEIGHTS: BanWeights = { meta: 1, threat: 2, pro: 1 };

export interface BanOptions {
  bracket?: Bracket;
  weights?: Partial<BanWeights>;
  limit?: number;
}

export interface BanBreakdown {
  metaAdvantage: number;
  /** Average advantage the hero has vs your team (how much it threatens you). */
  threatToMyTeam: number;
  /** Pro ban rate, normalized 0..1 across the dataset. */
  proBanRate: number;
}

export interface BanSuggestion {
  heroId: number;
  score: number;
  breakdown: BanBreakdown;
}

const META_SCALE = 1;
const THREAT_SCALE = 1;
const PRO_SCALE = 0.05;

function maxProBan(stats: HeroStat[]): number {
  return stats.reduce((m, s) => Math.max(m, s.proBan ?? 0), 0) || 1;
}

/**
 * Rank available heroes as ban candidates. Heroes that are strong in the meta,
 * threaten your current picks, or are heavily contested in pro play rank higher.
 */
export function recommendBans(
  dataset: Dataset,
  draft: { myTeam: number[]; enemy: number[]; bans: number[] },
  options: BanOptions = {},
): BanSuggestion[] {
  const bracket = options.bracket ?? 'legend';
  const weights: BanWeights = { ...DEFAULT_BAN_WEIGHTS, ...options.weights };
  const statById = new Map(dataset.stats.map((s) => [s.heroId, s]));
  const proMax = maxProBan(dataset.stats);

  const unavailable = new Set<number>([...draft.myTeam, ...draft.enemy, ...draft.bans]);

  const suggestions: BanSuggestion[] = [];
  for (const hero of dataset.heroes) {
    if (unavailable.has(hero.id)) continue;

    const metaAdvantage = heroWinrate(statById.get(hero.id), bracket) - 0.5;
    // How much this hero would counter your team if the enemy picked it.
    const threatToMyTeam = counterAdvantage(dataset, hero.id, draft.myTeam);
    const proBanRate = (statById.get(hero.id)?.proBan ?? 0) / proMax;

    const score =
      weights.meta * (metaAdvantage * META_SCALE) +
      weights.threat * (threatToMyTeam * THREAT_SCALE) +
      weights.pro * (proBanRate * PRO_SCALE);

    suggestions.push({
      heroId: hero.id,
      score,
      breakdown: { metaAdvantage, threatToMyTeam, proBanRate },
    });
  }

  suggestions.sort((a, b) => b.score - a.score || a.heroId - b.heroId);
  return typeof options.limit === 'number' ? suggestions.slice(0, options.limit) : suggestions;
}
