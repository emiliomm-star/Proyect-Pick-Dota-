// Pure, dependency-free recommendation engine.
//
// Everything here operates on the precomputed Dataset and is fully unit-testable
// in Node. No React / React Native imports may be added to this file.

import type { Bracket, Dataset, HeroStat, Matchup } from '../data/types';

export interface DraftState {
  /** Hero ids already picked by your team. */
  myTeam: number[];
  /** Hero ids picked by the enemy team. */
  enemy: number[];
  /** Hero ids banned (unavailable). */
  bans: number[];
}

export interface Weights {
  /** Weight for the hero's raw win rate in the selected bracket. */
  meta: number;
  /** Weight for how well the hero counters the enemy line-up. */
  counter: number;
  /** Weight for filling roles your team is missing. */
  role: number;
}

export interface RecommendOptions {
  bracket?: Bracket;
  weights?: Partial<Weights>;
  limit?: number;
}

export interface RecommendationBreakdown {
  /** heroWinrate - 0.5, e.g. +0.03 = 3 percentage points above average. */
  metaAdvantage: number;
  /** Average (matchupWinrate - 0.5) across the enemy line-up. */
  counterAdvantage: number;
  /** Fraction of your team's missing core roles this hero covers (0..1). */
  roleFit: number;
}

export interface Recommendation {
  heroId: number;
  score: number;
  breakdown: RecommendationBreakdown;
  /** Core roles this hero would add that the team currently lacks. */
  coveredMissingRoles: string[];
}

export const DEFAULT_WEIGHTS: Weights = { meta: 1, counter: 2, role: 1 };

/** Core roles we try to make sure a team covers. */
export const CORE_ROLES = ['Carry', 'Support', 'Initiator', 'Disabler', 'Nuker', 'Durable'] as const;

/**
 * roleFit is 0..1; to make it comparable to win-rate advantages (which are
 * small fractions) we scale it down before it enters the weighted score.
 * Covering the whole missing-role set is worth ~5 percentage points of edge.
 */
const ROLE_SCALE = 0.05;

/** Prior strength (in games) used to shrink small-sample win rates toward 50%. */
const SHRINKAGE_GAMES = 200;

/** Bayesian-shrunk win rate: pulls toward `prior` when the sample is small. */
export function shrunkWinrate(
  wins: number,
  games: number,
  prior = 0.5,
  strength = SHRINKAGE_GAMES,
): number {
  if (games <= 0) return prior;
  return (wins + strength * prior) / (games + strength);
}

function statById(dataset: Dataset): Map<number, HeroStat> {
  const map = new Map<number, HeroStat>();
  for (const s of dataset.stats) map.set(s.heroId, s);
  return map;
}

/** Hero win rate in a bracket (shrunk), or 0.5 when unknown. */
export function heroWinrate(stat: HeroStat | undefined, bracket: Bracket): number {
  const rec = stat?.byBracket?.[bracket];
  if (!rec) return 0.5;
  return shrunkWinrate(rec.win, rec.pick);
}

/**
 * Average matchup advantage of `heroId` against every enemy hero.
 * Returns 0 when there are no enemies or no matchup data.
 */
export function counterAdvantage(dataset: Dataset, heroId: number, enemy: number[]): number {
  if (enemy.length === 0) return 0;
  const rows: Matchup[] = dataset.matchups[heroId] ?? [];
  const byOpp = new Map<number, Matchup>();
  for (const m of rows) byOpp.set(m.heroId, m);

  let sum = 0;
  let counted = 0;
  for (const e of enemy) {
    const m = byOpp.get(e);
    if (!m) continue;
    sum += shrunkWinrate(m.wins, m.gamesPlayed) - 0.5;
    counted += 1;
  }
  return counted === 0 ? 0 : sum / counted;
}

/** Core roles not yet covered by the current team. */
export function missingCoreRoles(dataset: Dataset, myTeam: number[]): string[] {
  const heroById = new Map(dataset.heroes.map((h) => [h.id, h]));
  const covered = new Set<string>();
  for (const id of myTeam) {
    const hero = heroById.get(id);
    hero?.roles.forEach((r) => covered.add(r));
  }
  return CORE_ROLES.filter((r) => !covered.has(r));
}

/**
 * Rank every available hero for the current draft state.
 * Higher score = stronger recommendation.
 */
export function recommendHeroes(
  dataset: Dataset,
  draft: DraftState,
  options: RecommendOptions = {},
): Recommendation[] {
  const bracket = options.bracket ?? 'legend';
  const weights: Weights = { ...DEFAULT_WEIGHTS, ...options.weights };
  const stats = statById(dataset);

  const unavailable = new Set<number>([...draft.myTeam, ...draft.enemy, ...draft.bans]);
  const missing = new Set(missingCoreRoles(dataset, draft.myTeam));

  const recs: Recommendation[] = [];
  for (const hero of dataset.heroes) {
    if (unavailable.has(hero.id)) continue;

    const metaAdvantage = heroWinrate(stats.get(hero.id), bracket) - 0.5;
    const counter = counterAdvantage(dataset, hero.id, draft.enemy);

    const coveredMissingRoles = hero.roles.filter((r) => missing.has(r));
    const roleFit = missing.size === 0 ? 0 : coveredMissingRoles.length / missing.size;

    const score =
      weights.meta * metaAdvantage +
      weights.counter * counter +
      weights.role * (roleFit * ROLE_SCALE);

    recs.push({
      heroId: hero.id,
      score,
      breakdown: { metaAdvantage, counterAdvantage: counter, roleFit },
      coveredMissingRoles,
    });
  }

  recs.sort(
    (a, b) =>
      b.score - a.score ||
      b.breakdown.metaAdvantage - a.breakdown.metaAdvantage ||
      a.heroId - b.heroId,
  );

  return typeof options.limit === 'number' ? recs.slice(0, options.limit) : recs;
}
