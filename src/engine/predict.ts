// Draft win predictor ("the judge"). Given two full/partial drafts it estimates
// each side's win probability WITHOUT simulating the match — it composes the
// matchup, meta and composition signals into a single logistic score.
//
// Coefficients come from assets/weights.json (calibrated by scripts/calibrate.ts
// against real pro-match outcomes), falling back to pre-calibration defaults.

import type { Bracket, Dataset } from '../data/types';
import type { HeroAttributes } from '../data/heroAttributes';
import { modelWeights } from '../data/weights';
import { counterAdvantage, heroWinrate, shrunkWinrate } from './recommend';
import { teamProfile } from './composition';

export interface PredictCoeffs {
  intercept: number;
  matchup: number;
  meta: number;
  composition: number;
  timing: number;
}

export interface PredictOptions {
  bracket?: Bracket;
  attributesFor?: (heroId: number) => HeroAttributes;
  /** Override the model coefficients (defaults to the calibrated weights). */
  coeffs?: PredictCoeffs;
}

export interface DraftFeatures {
  /** Radiant-perspective average matchup advantage across all pairs. */
  matchupEdge: number;
  /** Radiant avg win rate minus dire avg win rate (bracket meta). */
  metaEdge: number;
  /** Radiant composition coverage minus dire, as a fraction (-1..1). */
  compEdge: number;
  /**
   * Radiant avg power-spike lean minus dire's (-1..1). Each hero scores
   * early=-1, mid=0, late=+1, then teams are averaged and compared. The SIGN
   * of this feature's effect on the outcome isn't assumed here — it's learned
   * by calibration (scripts/calibrate.ts) from real match results.
   */
  timingEdge: number;
}

export interface KeyMatchup {
  heroId: number;
  vsHeroId: number;
  winrate: number;
  advantage: number;
  side: 'radiant' | 'dire';
}

export interface PredictionBreakdown extends DraftFeatures {
  logit: number;
}

export interface Prediction {
  radiantWinProb: number;
  direWinProb: number;
  breakdown: PredictionBreakdown;
  /** Coefficients actually applied (calibrated or overridden). */
  coeffsUsed: PredictCoeffs;
  keyMatchups: KeyMatchup[];
  incomplete: boolean;
}

/**
 * Default (pre-calibration) coefficients, kept for reference/fallback.
 * `timing` starts at 0 (inert) because, unlike the others, its direction isn't
 * a safe hand-picked guess — it's meant to be learned by calibration.
 */
export const PREDICT_COEFFS: PredictCoeffs = { intercept: 0, matchup: 8, meta: 6, composition: 0.5, timing: 0 };

function currentCoeffs(): PredictCoeffs {
  return {
    intercept: modelWeights.intercept ?? 0,
    matchup: modelWeights.matchup ?? PREDICT_COEFFS.matchup,
    meta: modelWeights.meta ?? PREDICT_COEFFS.meta,
    composition: modelWeights.composition ?? PREDICT_COEFFS.composition,
    timing: modelWeights.timing ?? PREDICT_COEFFS.timing,
  };
}

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

const POWER_SPIKE_SCORE: Record<HeroAttributes['powerSpike'], number> = {
  early: -1,
  mid: 0,
  late: 1,
};

/** Team's average power-spike lean (-1 fully early .. +1 fully late). */
function teamTimingLean(
  team: number[],
  attributesFor?: (heroId: number) => HeroAttributes,
): number {
  if (!attributesFor || team.length === 0) return 0;
  return avg(team.map((id) => POWER_SPIKE_SCORE[attributesFor(id).powerSpike]));
}

/** Compute the raw feature vector (same features used to train the model). */
export function draftFeatures(
  dataset: Dataset,
  radiant: number[],
  dire: number[],
  options: PredictOptions = {},
): DraftFeatures {
  const bracket = options.bracket ?? 'legend';
  const matchupEdge = avg(radiant.map((r) => counterAdvantage(dataset, r, dire)));
  const metaEdge =
    teamMetaWinrate(dataset, radiant, bracket) - teamMetaWinrate(dataset, dire, bracket);
  const compEdge =
    compCoverage(radiant, options.attributesFor) - compCoverage(dire, options.attributesFor);
  const timingEdge =
    teamTimingLean(radiant, options.attributesFor) - teamTimingLean(dire, options.attributesFor);
  return { matchupEdge, metaEdge, compEdge, timingEdge };
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

/** Estimate the win probability of a radiant draft vs a dire draft. */
export function predictDraft(
  dataset: Dataset,
  radiant: number[],
  dire: number[],
  options: PredictOptions = {},
): Prediction {
  const incomplete = radiant.length === 0 || dire.length === 0;
  const coeffsUsed = options.coeffs ?? currentCoeffs();
  const features = draftFeatures(dataset, radiant, dire, options);

  const logit =
    coeffsUsed.intercept +
    coeffsUsed.matchup * features.matchupEdge +
    coeffsUsed.meta * features.metaEdge +
    coeffsUsed.composition * features.compEdge +
    coeffsUsed.timing * features.timingEdge;

  const radiantWinProb = incomplete ? 0.5 : sigmoid(logit);

  return {
    radiantWinProb,
    direWinProb: 1 - radiantWinProb,
    breakdown: { ...features, logit },
    coeffsUsed,
    keyMatchups: keyMatchupsFor(dataset, radiant, dire),
    incomplete,
  };
}
