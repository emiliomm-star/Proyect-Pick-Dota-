// Draft win predictor ("the judge"). Given two full/partial drafts it estimates
// each side's win probability WITHOUT simulating the match — it composes the
// matchup, meta and composition signals into a single logistic score.
//
// The coefficients below are sensible pre-calibration defaults. A later step
// fits them against real pro-match outcomes (scripts + a calibrated weights
// file); until then this is explicitly an ESTIMATE, not an oracle.

import type { Bracket, Dataset } from '../data/types';
import type { HeroAttributes } from '../data/heroAttributes';
import { counterAdvantage, heroWinrate, shrunkWinrate } from './recommend';
import { teamProfile } from './composition';

export interface PredictOptions {
  bracket?: Bracket;
  attributesFor?: (heroId: number) => HeroAttributes;
}

export interface KeyMatchup {
  /** Hero on the side the advantage favors. */
  heroId: number;
  /** The opponent. */
  vsHeroId: number;
  /** Win rate of heroId vs vsHeroId. */
  winrate: number;
  /** winrate - 0.5. */
  advantage: number;
  side: 'radiant' | 'dire';
}

export interface PredictionBreakdown {
  /** Radiant-perspective average matchup advantage across all pairs. */
  matchupEdge: number;
  /** Radiant avg win rate minus dire avg win rate (bracket meta). */
  metaEdge: number;
  /** Radiant composition coverage minus dire, as a fraction (-1..1). */
  compEdge: number;
  /** The logit fed into the sigmoid. */
  logit: number;
}

export interface Prediction {
  radiantWinProb: number;
  direWinProb: number;
  breakdown: PredictionBreakdown;
  /** A few of the most lopsided individual matchups, for explanation. */
  keyMatchups: KeyMatchup[];
  /** True when at least one side has no heroes (result is not meaningful). */
  incomplete: boolean;
}

// Pre-calibration coefficients (see file header).
export const PREDICT_COEFFS = { matchup: 8, meta: 6, composition: 0.5 } as const;

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length;
}

function teamMetaWinrate(dataset: Dataset, team: number[], bracket: Bracket): number {
  const statById = new Map(dataset.stats.map((s) => [s.heroId, s]));
  return avg(team.map((id) => heroWinrate(statById.get(id), bracket)));
}

function compCoverage(
  team: number[],
  attributesFor?: (heroId: number) => HeroAttributes,
): number {
  if (!attributesFor || team.length === 0) return 0;
  const profile = teamProfile(team.map(attributesFor));
  const totalNeeds = profile.covered.size + profile.gaps.length;
  return totalNeeds === 0 ? 0 : profile.covered.size / totalNeeds;
}

function keyMatchupsFor(dataset: Dataset, radiant: number[], dire: number[]): KeyMatchup[] {
  const cells: KeyMatchup[] = [];
  for (const r of radiant) {
    const idx = new Map((dataset.matchups[r] ?? []).map((m) => [m.heroId, m]));
    for (const d of dire) {
      const m = idx.get(d);
      if (!m) continue;
      const winrate = shrunkWinrate(m.wins, m.gamesPlayed);
      const advantage = winrate - 0.5;
      if (advantage >= 0) {
        cells.push({ heroId: r, vsHeroId: d, winrate, advantage, side: 'radiant' });
      } else {
        cells.push({ heroId: d, vsHeroId: r, winrate: 1 - winrate, advantage: -advantage, side: 'dire' });
      }
    }
  }
  return cells.sort((a, b) => b.advantage - a.advantage).slice(0, 5);
}

/**
 * Estimate the win probability of a radiant draft vs a dire draft.
 */
export function predictDraft(
  dataset: Dataset,
  radiant: number[],
  dire: number[],
  options: PredictOptions = {},
): Prediction {
  const bracket = options.bracket ?? 'legend';
  const incomplete = radiant.length === 0 || dire.length === 0;

  // Radiant-perspective matchup edge: average of each radiant hero's advantage
  // vs the dire line-up.
  const matchupEdge = avg(radiant.map((r) => counterAdvantage(dataset, r, dire)));

  const metaEdge =
    teamMetaWinrate(dataset, radiant, bracket) - teamMetaWinrate(dataset, dire, bracket);

  const compEdge =
    compCoverage(radiant, options.attributesFor) - compCoverage(dire, options.attributesFor);

  const logit =
    PREDICT_COEFFS.matchup * matchupEdge +
    PREDICT_COEFFS.meta * metaEdge +
    PREDICT_COEFFS.composition * compEdge;

  const radiantWinProb = incomplete ? 0.5 : sigmoid(logit);

  return {
    radiantWinProb,
    direWinProb: 1 - radiantWinProb,
    breakdown: { matchupEdge, metaEdge, compEdge, logit },
    keyMatchups: keyMatchupsFor(dataset, radiant, dire),
    incomplete,
  };
}
