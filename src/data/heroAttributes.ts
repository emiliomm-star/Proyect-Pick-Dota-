// Curated per-hero attributes used for team composition analysis.
//
// These are NOT available from OpenDota in a structured way (damage type,
// reliable lockdown, save, etc. would have to be inferred from ability data).
// Hand-curating them is exactly what lets this app analyze a draft's
// composition — something Dota Plus does not surface. This table starts with
// the sample heroes and is meant to be expanded to the full roster; heroes
// without an entry fall back to a neutral profile.

export type DamageType = 'magical' | 'physical' | 'pure';
export type PowerSpike = 'early' | 'mid' | 'late';

export interface HeroAttributes {
  /** Damage types the hero primarily deals. */
  damageTypes: DamageType[];
  /** Reliable lockdown: stun, root, hex, taunt (not just a slow/silence). */
  hardDisable: boolean;
  /** Can hard-engage a fight (blink/AoE lock, long-range initiation). */
  initiation: boolean;
  /** Meaningful AoE teamfight impact (an ult or ability that swings fights). */
  teamfight: boolean;
  /** Clears waves / pushes towers efficiently. */
  waveclear: boolean;
  /** Sustained healing / lifesteal for self or team. */
  sustain: boolean;
  /** Can actively save an ally (peel that protects, not just personal escape). */
  save: boolean;
  /** Reliable personal escape / mobility. */
  escape: boolean;
  /** When the hero is strongest. */
  powerSpike: PowerSpike;
  /** Tanky / hard to kill. */
  durable: boolean;
}

const NEUTRAL: HeroAttributes = {
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
};

export const heroAttributes: Record<number, HeroAttributes> = {
  // Anti-Mage
  1: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: false, sustain: false, save: false, escape: true, powerSpike: 'late', durable: false },
  // Axe
  2: { damageTypes: ['physical'], hardDisable: true, initiation: true, teamfight: true, waveclear: false, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Crystal Maiden
  5: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Drow Ranger
  6: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'late', durable: false },
  // Juggernaut
  8: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: true, sustain: true, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Shadow Fiend
  11: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Pudge
  14: { damageTypes: ['magical'], hardDisable: true, initiation: true, teamfight: false, waveclear: false, sustain: true, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Tiny
  19: { damageTypes: ['magical', 'physical'], hardDisable: true, initiation: true, teamfight: false, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Lina
  25: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Lion
  26: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: false, waveclear: false, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
};

/** Attributes for a hero, falling back to a neutral profile when uncurated. */
export function getAttributes(heroId: number): HeroAttributes {
  return heroAttributes[heroId] ?? NEUTRAL;
}

/** True when we have curated (non-fallback) data for the hero. */
export function hasAttributes(heroId: number): boolean {
  return heroId in heroAttributes;
}
