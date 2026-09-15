// Ally synergy analysis: rewards concrete draft-theory combos between
// DIFFERENT heroes that team-level composition coverage doesn't capture on
// its own. `composition.ts` only checks "does the team have X anywhere"
// (binary, per need); synergy here checks pairwise/count interactions —
// e.g. whether a team's disables actually chain, or whether a save has
// someone worth protecting.
//
// OpenDota has no reachable "duo win rate" endpoint at the scale this app
// needs (it would require mining match-level SQL via /explorer for every
// hero pair), so this is an approximation from the same curated attributes
// used for composition — same data source, same limitations.

import type { HeroAttributes } from '../data/heroAttributes';

export interface SynergyBreakdown {
  /** 2+ heroes with hard disable: control chains through BKB / duration. */
  disableChain: boolean;
  /** A save/peel hero paired with a squishy, escape-less core to protect. */
  saveForVulnerableCore: boolean;
  /** 2+ heroes with real teamfight impact: not a one-button win condition. */
  multipleThreats: boolean;
}

export interface SynergyScore {
  breakdown: SynergyBreakdown;
  /** Fraction of synergy rules satisfied (0..1). */
  score: number;
}

const RULE_KEYS: (keyof SynergyBreakdown)[] = [
  'disableChain',
  'saveForVulnerableCore',
  'multipleThreats',
];

/** Score a team's ally synergy from its heroes' curated attributes. */
export function teamSynergy(attrsList: HeroAttributes[]): SynergyScore {
  const disableCount = attrsList.filter((a) => a.hardDisable).length;
  const teamfightCount = attrsList.filter((a) => a.teamfight).length;
  const hasSave = attrsList.some((a) => a.save);
  // The vulnerable core must be a DIFFERENT hero than the one providing the
  // save — a hero doesn't "protect itself" for synergy purposes.
  const hasVulnerableAlly = attrsList.some((a) => !a.save && !a.escape && !a.durable);

  const breakdown: SynergyBreakdown = {
    disableChain: disableCount >= 2,
    saveForVulnerableCore: hasSave && hasVulnerableAlly,
    multipleThreats: teamfightCount >= 2,
  };

  const satisfied = RULE_KEYS.filter((k) => breakdown[k]).length;
  return { breakdown, score: satisfied / RULE_KEYS.length };
}

export const SYNERGY_LABELS: Record<keyof SynergyBreakdown, string> = {
  disableChain: 'Puede encadenar controles (2+ disables)',
  saveForVulnerableCore: 'Tiene con qué proteger a su core expuesto',
  multipleThreats: 'No depende de un solo héroe para pelear',
};
