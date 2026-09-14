// Curated per-hero attributes used for team composition analysis.
//
// These are NOT available from OpenDota in a structured way (damage type,
// reliable lockdown, save, etc. would have to be inferred from ability data).
// Hand-curating them is exactly what lets this app analyze a draft's
// composition — something Dota Plus does not surface. This table starts with
// the sample heroes and is meant to be expanded to the full roster; heroes
// without an entry fall back to a neutral profile.

import { dataset } from './dataset';
import type { HeroAttributeSeed } from './types';

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
  // Bane
  3: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: false, waveclear: false, sustain: false, save: true, escape: false, powerSpike: 'mid', durable: false },
  // Bloodseeker
  4: { damageTypes: ['physical', 'pure'], hardDisable: false, initiation: false, teamfight: false, waveclear: false, sustain: true, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Earthshaker
  7: { damageTypes: ['magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: false, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Mirana
  9: { damageTypes: ['magical', 'physical'], hardDisable: true, initiation: false, teamfight: false, waveclear: true, sustain: false, save: true, escape: true, powerSpike: 'mid', durable: false },
  // Morphling
  10: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: false, sustain: true, save: false, escape: true, powerSpike: 'late', durable: false },
  // Puck
  13: { damageTypes: ['magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Razor
  15: { damageTypes: ['magical', 'physical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Sand King
  16: { damageTypes: ['magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: true },
  // Storm Spirit
  17: { damageTypes: ['magical'], hardDisable: false, initiation: true, teamfight: false, waveclear: true, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Sven
  18: { damageTypes: ['physical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Vengeful Spirit
  20: { damageTypes: ['physical'], hardDisable: true, initiation: false, teamfight: false, waveclear: false, sustain: false, save: true, escape: false, powerSpike: 'mid', durable: false },
  // Windranger
  21: { damageTypes: ['physical', 'magical'], hardDisable: true, initiation: false, teamfight: false, waveclear: false, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Zeus
  22: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Kunkka
  23: { damageTypes: ['physical', 'magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: true, escape: false, powerSpike: 'mid', durable: true },
  // Shadow Shaman
  27: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: false, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Slardar
  28: { damageTypes: ['physical'], hardDisable: true, initiation: true, teamfight: false, waveclear: false, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Tidehunter
  29: { damageTypes: ['physical', 'magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Witch Doctor
  30: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: true, waveclear: false, sustain: true, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Lich
  31: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Riki
  32: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: false, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Enigma
  33: { damageTypes: ['magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Tinker
  34: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Sniper
  35: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'late', durable: false },
  // Necrophos
  36: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: true, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Warlock
  37: { damageTypes: ['magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: false, sustain: true, save: true, escape: false, powerSpike: 'mid', durable: false },
  // Beastmaster
  38: { damageTypes: ['physical', 'magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: false, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Queen of Pain
  39: { damageTypes: ['magical'], hardDisable: false, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Venomancer
  40: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Faceless Void
  41: { damageTypes: ['physical'], hardDisable: true, initiation: true, teamfight: true, waveclear: false, sustain: false, save: false, escape: true, powerSpike: 'late', durable: false },
  // Death Prophet
  43: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: true, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Phantom Assassin
  44: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: false, sustain: false, save: false, escape: true, powerSpike: 'late', durable: false },
  // Pugna
  45: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: true, save: true, escape: false, powerSpike: 'mid', durable: false },
  // Templar Assassin
  46: { damageTypes: ['physical', 'magical'], hardDisable: false, initiation: false, teamfight: false, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Viper
  47: { damageTypes: ['magical', 'physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Invoker
  74: { damageTypes: ['magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Ogre Magi
  84: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: false, waveclear: false, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: true },
  // Rubick
  86: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: true, waveclear: false, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Disruptor
  87: { damageTypes: ['magical'], hardDisable: true, initiation: false, teamfight: true, waveclear: false, sustain: false, save: true, escape: false, powerSpike: 'mid', durable: false },
  // Keeper of the Light
  90: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: true, waveclear: true, sustain: true, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Skywrath Mage
  101: { damageTypes: ['magical'], hardDisable: false, initiation: false, teamfight: false, waveclear: true, sustain: false, save: false, escape: false, powerSpike: 'mid', durable: false },
  // Ember Spirit
  106: { damageTypes: ['physical', 'magical'], hardDisable: true, initiation: true, teamfight: true, waveclear: true, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
  // Terrorblade
  109: { damageTypes: ['physical'], hardDisable: false, initiation: false, teamfight: false, waveclear: true, sustain: false, save: true, escape: false, powerSpike: 'late', durable: false },
  // Monkey King
  114: { damageTypes: ['physical'], hardDisable: true, initiation: true, teamfight: true, waveclear: false, sustain: false, save: false, escape: true, powerSpike: 'mid', durable: false },
};

/**
 * Merge attribute sources into a full profile. Precedence, lowest to highest:
 * neutral defaults < pipeline-derived seed < hand-curated overlay.
 * (Pure and testable — does not read the bundled dataset.)
 */
export function mergeAttributes(
  seed?: HeroAttributeSeed,
  curated?: Partial<HeroAttributes>,
): HeroAttributes {
  return { ...NEUTRAL, ...(seed ?? {}), ...(curated ?? {}) };
}

/** Attributes for a hero: curated overlay > dataset seed > neutral fallback. */
export function getAttributes(heroId: number): HeroAttributes {
  return mergeAttributes(dataset.heroAttributes?.[heroId], heroAttributes[heroId]);
}

/** True when we have curated or pipeline-derived data for the hero. */
export function hasAttributes(heroId: number): boolean {
  return heroId in heroAttributes || dataset.heroAttributes?.[heroId] != null;
}
