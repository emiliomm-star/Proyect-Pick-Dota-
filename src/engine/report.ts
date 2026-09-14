// Post-draft educational report: explains WHY a draft wins, lists each side's
// strengths and weaknesses, and suggests how the winner could improve their
// draft (an alternative pick that raises their win probability).
//
// Pure and testable; no UI imports.

import type { Bracket, Dataset } from '../data/types';
import type { HeroAttributes } from '../data/heroAttributes';
import { counterAdvantage } from './recommend';
import { NEED_LABELS, teamProfile, type Need } from './composition';
import { predictDraft, type KeyMatchup } from './predict';

export type SideId = 'radiant' | 'dire';

export interface SideReport {
  side: SideId;
  strengths: string[];
  weaknesses: string[];
  /** Matchups where this side dominates. */
  dominantMatchups: KeyMatchup[];
}

export interface ImprovementSuggestion {
  outHeroId: number;
  inHeroId: number;
  reason: string;
  winProbBefore: number;
  winProbAfter: number;
}

export interface DraftReport {
  winner: SideId | 'tie';
  /** Winner win probability (0.5..1). */
  winnerProb: number;
  /** Plain-language reasons the winner is ahead, most important first. */
  summary: string[];
  radiant: SideReport;
  dire: SideReport;
  /** An idea for the winner to improve / an alternative vision (may be null). */
  winnerImprovement: ImprovementSuggestion | null;
}

export interface ReportOptions {
  bracket?: Bracket;
  attributesFor?: (heroId: number) => HeroAttributes;
}

const MIN_SWAP_GAIN = 0.015; // 1.5 percentage points

function listNeeds(needs: Iterable<Need>): string {
  return [...needs].map((n) => NEED_LABELS[n]).join(', ');
}

function sideStrengthsWeaknesses(
  dataset: Dataset,
  team: number[],
  enemy: number[],
  attrsFor: ((id: number) => HeroAttributes) | undefined,
  keyMatchups: KeyMatchup[],
  side: SideId,
): SideReport {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (attrsFor && team.length > 0) {
    const profile = teamProfile(team.map(attrsFor));
    const { magical, physical } = profile.damageMix;

    if (magical > 0 && physical > 0) strengths.push('Daño mixto: difícil de itemizar en contra.');
    if (profile.covered.has('initiation') && profile.covered.has('teamfight')) {
      strengths.push('Buen paquete de pelea (iniciación + daño en área).');
    }
    if (profile.covered.has('save')) strengths.push('Puede proteger a sus cores (save/peel).');
    if (profile.covered.size > 0) strengths.push(`Cubre: ${listNeeds(profile.covered)}.`);

    if (profile.gaps.length > 0) weaknesses.push(`Le falta: ${listNeeds(profile.gaps)}.`);
    if (magical === 0 && physical > 0) weaknesses.push('Todo daño físico: vulnerable a armadura.');
    if (physical === 0 && magical > 0) weaknesses.push('Todo daño mágico: vulnerable a BKB / resistencia mágica.');
    if (profile.counts.lateGame >= 3) weaknesses.push('Muy dependiente del late game: débil temprano.');
  }

  // Heroes on this side that are hard-countered by the enemy line-up.
  for (const h of team) {
    const adv = counterAdvantage(dataset, h, enemy);
    if (adv <= -0.03) {
      const name = dataset.heroes.find((x) => x.id === h)?.localizedName ?? String(h);
      weaknesses.push(`${name} sufre contra la línea enemiga (${(adv * 100).toFixed(1)} pp).`);
    }
  }

  return {
    side,
    strengths,
    weaknesses,
    dominantMatchups: keyMatchups.filter((k) => k.side === side),
  };
}

function winnerProbFor(
  dataset: Dataset,
  winner: SideId,
  radiant: number[],
  dire: number[],
  options: ReportOptions,
): number {
  const p = predictDraft(dataset, radiant, dire, options);
  return winner === 'radiant' ? p.radiantWinProb : p.direWinProb;
}

/**
 * Search for a single-hero swap on the winner's team that most increases their
 * win probability. Returns null if no swap beats the improvement threshold.
 */
function findWinnerImprovement(
  dataset: Dataset,
  winner: SideId,
  radiant: number[],
  dire: number[],
  options: ReportOptions,
): ImprovementSuggestion | null {
  const team = winner === 'radiant' ? radiant : dire;
  const enemy = winner === 'radiant' ? dire : radiant;
  const used = new Set<number>([...radiant, ...dire]);
  const attrsFor = options.attributesFor;

  const before = winnerProbFor(dataset, winner, radiant, dire, options);

  let best: ImprovementSuggestion | null = null;

  for (const out of team) {
    const rest = team.filter((h) => h !== out);
    const restGaps = attrsFor ? new Set(teamProfile(rest.map(attrsFor)).gaps) : new Set<Need>();

    for (const cand of dataset.heroes) {
      if (used.has(cand.id)) continue;
      const newTeam = [...rest, cand.id];
      const newRadiant = winner === 'radiant' ? newTeam : radiant;
      const newDire = winner === 'radiant' ? dire : newTeam;
      const after = winnerProbFor(dataset, winner, newRadiant, newDire, options);
      const gain = after - before;

      if (gain > MIN_SWAP_GAIN && (!best || after > best.winProbAfter)) {
        // Explain what the incoming hero adds.
        let reason = 'mejora el enfrentamiento global';
        if (attrsFor) {
          const covered = teamProfile([cand.id].map(attrsFor)).covered;
          const closes = [...covered].filter((n) => restGaps.has(n));
          if (closes.length > 0) reason = `aporta ${listNeeds(closes)}`;
        }
        best = {
          outHeroId: out,
          inHeroId: cand.id,
          reason,
          winProbBefore: before,
          winProbAfter: after,
        };
      }
    }
  }

  return best;
}

/** Build the full educational report for a completed pick battle. */
export function draftReport(
  dataset: Dataset,
  radiant: number[],
  dire: number[],
  options: ReportOptions = {},
): DraftReport {
  const prediction = predictDraft(dataset, radiant, dire, options);
  const { radiantWinProb, breakdown, keyMatchups, coeffsUsed } = prediction;

  let winner: SideId | 'tie';
  if (Math.abs(radiantWinProb - 0.5) < 0.02) winner = 'tie';
  else winner = radiantWinProb > 0.5 ? 'radiant' : 'dire';

  const winnerProb = winner === 'dire' ? 1 - radiantWinProb : radiantWinProb;

  // Explain the win: rank the three factors by contribution toward the winner.
  const sign = winner === 'dire' ? -1 : 1; // breakdown is radiant-perspective
  const contributions: { label: string; value: number }[] = [
    { label: 'domina los enfrentamientos (matchups)', value: sign * coeffsUsed.matchup * breakdown.matchupEdge },
    { label: 'tiene mejor meta (win rate de héroes)', value: sign * coeffsUsed.meta * breakdown.metaEdge },
    { label: 'tiene mejor composición de equipo', value: sign * coeffsUsed.composition * breakdown.compEdge },
  ];
  const summary = contributions
    .filter((c) => c.value > 0.02)
    .sort((a, b) => b.value - a.value)
    .map((c) => `El draft ganador ${c.label}.`);
  if (summary.length === 0 && winner !== 'tie') {
    summary.push('Ventaja mínima: los drafts están muy parejos.');
  }

  return {
    winner,
    winnerProb,
    summary,
    radiant: sideStrengthsWeaknesses(dataset, radiant, dire, options.attributesFor, keyMatchups, 'radiant'),
    dire: sideStrengthsWeaknesses(dataset, dire, radiant, options.attributesFor, keyMatchups, 'dire'),
    winnerImprovement:
      winner === 'tie' ? null : findWinnerImprovement(dataset, winner, radiant, dire, options),
  };
}
