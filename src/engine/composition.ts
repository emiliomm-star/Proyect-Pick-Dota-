// Team composition analysis. Pure and testable; no UI imports.
//
// Turns a set of picked heroes into a readable profile ("your team lacks
// initiation and magic damage; the enemy is mostly physical") and into a set of
// gaps the recommender can reward candidates for closing.

import type { DamageType, HeroAttributes } from '../data/heroAttributes';

/** Capabilities a team is checked for. */
export type Need =
  | 'disable'
  | 'initiation'
  | 'teamfight'
  | 'waveclear'
  | 'save'
  | 'magical'
  | 'physical';

export const NEEDS: Need[] = [
  'disable',
  'initiation',
  'teamfight',
  'waveclear',
  'save',
  'magical',
  'physical',
];

export const NEED_LABELS: Record<Need, string> = {
  disable: 'Lockdown',
  initiation: 'Iniciación',
  teamfight: 'Teamfight (AoE)',
  waveclear: 'Waveclear / push',
  save: 'Save / peel',
  magical: 'Daño mágico',
  physical: 'Daño físico',
};

/** Which needs a single hero satisfies. */
export function needsCoveredBy(attrs: HeroAttributes): Set<Need> {
  const set = new Set<Need>();
  if (attrs.hardDisable) set.add('disable');
  if (attrs.initiation) set.add('initiation');
  if (attrs.teamfight) set.add('teamfight');
  if (attrs.waveclear) set.add('waveclear');
  if (attrs.save) set.add('save');
  if (attrs.damageTypes.includes('magical')) set.add('magical');
  if (attrs.damageTypes.includes('physical')) set.add('physical');
  return set;
}

export interface DamageMix {
  magical: number;
  physical: number;
  pure: number;
}

export interface TeamProfile {
  /** Needs covered by at least one hero on the team. */
  covered: Set<Need>;
  /** Needs no hero on the team covers. */
  gaps: Need[];
  damageMix: DamageMix;
  counts: {
    durable: number;
    sustain: number;
    escape: number;
    lateGame: number;
  };
}

function damageMix(attrsList: HeroAttributes[]): DamageMix {
  const mix: DamageMix = { magical: 0, physical: 0, pure: 0 };
  for (const a of attrsList) {
    for (const t of a.damageTypes) mix[t] += 1;
  }
  return mix;
}

/** Build the profile of a single team from its heroes' attributes. */
export function teamProfile(attrsList: HeroAttributes[]): TeamProfile {
  const covered = new Set<Need>();
  for (const a of attrsList) {
    for (const n of needsCoveredBy(a)) covered.add(n);
  }
  return {
    covered,
    gaps: NEEDS.filter((n) => !covered.has(n)),
    damageMix: damageMix(attrsList),
    counts: {
      durable: attrsList.filter((a) => a.durable).length,
      sustain: attrsList.filter((a) => a.sustain).length,
      escape: attrsList.filter((a) => a.escape).length,
      lateGame: attrsList.filter((a) => a.powerSpike === 'late').length,
    },
  };
}

const GAP_WARNINGS: Record<Need, string> = {
  disable: 'Sin lockdown fiable (stun/root/hex): difícil frenar a los cores enemigos.',
  initiation: 'Sin iniciación: te costará empezar peleas en tus términos.',
  teamfight: 'Poco impacto en teamfight (falta daño en área).',
  waveclear: 'Sin waveclear/push: difícil cerrar la partida y defender oleadas.',
  save: 'Sin save/peel: tus cores quedan expuestos al burst enemigo.',
  magical: 'Todo daño físico: vulnerable a mucha armadura (equipos con Assault/Shiva).',
  physical: 'Todo daño mágico: vulnerable a resistencia mágica y BKB.',
};

export interface CompositionReport {
  team: TeamProfile;
  enemy: TeamProfile;
  /** Human-readable warnings about your team's gaps. */
  warnings: string[];
  /** Informational notes about the enemy threat profile. */
  enemyThreat: string[];
}

function enemyThreatNotes(enemy: TeamProfile, enemyCount: number): string[] {
  if (enemyCount === 0) return [];
  const notes: string[] = [];
  const { magical, physical } = enemy.damageMix;
  if (physical > 0 && physical >= magical * 2) {
    notes.push('Enemigo mayormente físico: prioriza armadura (bien contra sus cores).');
  } else if (magical > 0 && magical >= physical * 2) {
    notes.push('Enemigo mayormente mágico: prioriza resistencia mágica / BKB.');
  } else if (magical > 0 && physical > 0) {
    notes.push('Enemigo con daño mixto: valora BKB + armadura según la amenaza.');
  }
  if (enemy.covered.has('initiation') && enemy.covered.has('teamfight')) {
    notes.push('Enemigo con fuerte iniciación + teamfight: cuida el posicionamiento y ten BKB/save.');
  }
  return notes;
}

/**
 * Analyze both teams. `attrsFor` resolves a hero id to its attributes.
 */
export function analyzeComposition(
  myTeam: number[],
  enemy: number[],
  attrsFor: (heroId: number) => HeroAttributes,
): CompositionReport {
  const team = teamProfile(myTeam.map(attrsFor));
  const enemyProfile = teamProfile(enemy.map(attrsFor));

  // Only warn about gaps once the draft has some heroes; an empty team trivially
  // "lacks everything", which isn't useful.
  const warnings = myTeam.length === 0 ? [] : team.gaps.map((g) => GAP_WARNINGS[g]);

  return {
    team,
    enemy: enemyProfile,
    warnings,
    enemyThreat: enemyThreatNotes(enemyProfile, enemy.length),
  };
}

/**
 * How much a candidate closes the current gaps (0..1). Used to bias the
 * recommender toward heroes that round out the draft.
 */
export function compositionBonus(candidate: HeroAttributes, gaps: Need[]): number {
  if (gaps.length === 0) return 0;
  const covered = needsCoveredBy(candidate);
  const filled = gaps.filter((g) => covered.has(g)).length;
  return filled / gaps.length;
}
