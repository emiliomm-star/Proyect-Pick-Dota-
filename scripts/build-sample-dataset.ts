/**
 * Generates assets/dataset.json as a small but realistic SAMPLE dataset.
 *
 * This exists because api.opendota.com is not reachable from every dev/CI
 * sandbox. It lets you develop and test the engine + UI offline. The REAL
 * dataset (all heroes, live numbers) is produced by scripts/build-dataset.ts.
 *
 * Run: npx tsx scripts/build-sample-dataset.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  Dataset,
  Hero,
  HeroStat,
  HeroItemBuckets,
  ItemConstant,
  Matchup,
} from '../src/data/types';

const CDN = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes';

interface SeedHero {
  id: number;
  name: string; // internal short name, e.g. "antimage"
  localizedName: string;
  primaryAttr: Hero['primaryAttr'];
  attackType: Hero['attackType'];
  roles: string[];
  legendWinrate: number; // overall winrate at Legend bracket (%)
  build: 'carry' | 'support' | 'initiator';
}

const HEROES: SeedHero[] = [
  { id: 1, name: 'antimage', localizedName: 'Anti-Mage', primaryAttr: 'agi', attackType: 'Melee', roles: ['Carry', 'Escape', 'Nuker'], legendWinrate: 49.5, build: 'carry' },
  { id: 2, name: 'axe', localizedName: 'Axe', primaryAttr: 'str', attackType: 'Melee', roles: ['Initiator', 'Durable', 'Disabler', 'Carry', 'Jungler'], legendWinrate: 52.0, build: 'initiator' },
  { id: 5, name: 'crystal_maiden', localizedName: 'Crystal Maiden', primaryAttr: 'int', attackType: 'Ranged', roles: ['Support', 'Disabler', 'Nuker', 'Jungler'], legendWinrate: 51.0, build: 'support' },
  { id: 6, name: 'drow_ranger', localizedName: 'Drow Ranger', primaryAttr: 'agi', attackType: 'Ranged', roles: ['Carry', 'Disabler', 'Pusher'], legendWinrate: 48.5, build: 'carry' },
  { id: 8, name: 'juggernaut', localizedName: 'Juggernaut', primaryAttr: 'agi', attackType: 'Melee', roles: ['Carry', 'Pusher', 'Escape'], legendWinrate: 51.5, build: 'carry' },
  { id: 11, name: 'nevermore', localizedName: 'Shadow Fiend', primaryAttr: 'agi', attackType: 'Ranged', roles: ['Carry', 'Nuker', 'Pusher', 'Disabler'], legendWinrate: 47.5, build: 'carry' },
  { id: 14, name: 'pudge', localizedName: 'Pudge', primaryAttr: 'str', attackType: 'Melee', roles: ['Disabler', 'Initiator', 'Durable', 'Nuker'], legendWinrate: 50.5, build: 'initiator' },
  { id: 19, name: 'tiny', localizedName: 'Tiny', primaryAttr: 'str', attackType: 'Melee', roles: ['Carry', 'Nuker', 'Pusher', 'Initiator', 'Durable'], legendWinrate: 50.0, build: 'carry' },
  { id: 25, name: 'lina', localizedName: 'Lina', primaryAttr: 'int', attackType: 'Ranged', roles: ['Support', 'Carry', 'Nuker', 'Disabler'], legendWinrate: 49.0, build: 'support' },
  { id: 26, name: 'lion', localizedName: 'Lion', primaryAttr: 'int', attackType: 'Ranged', roles: ['Support', 'Disabler', 'Nuker', 'Initiator'], legendWinrate: 53.0, build: 'support' },
];

// Adversarial winrate matrix: WR[a][b] = hero a's winrate (%) when facing hero b.
// Ordered to match HEROES above. Diagonal is ignored.
const ORDER = HEROES.map((h) => h.id);
// prettier-ignore
const WR: Record<number, Record<number, number>> = {
  1:  { 2: 46, 5: 54, 6: 50, 8: 49, 11: 52, 14: 45, 19: 48, 25: 53, 26: 54 },
  2:  { 1: 53, 5: 48, 6: 52, 8: 50, 11: 51, 14: 49, 19: 50, 25: 52, 26: 49 },
  5:  { 1: 46, 2: 51, 6: 48, 8: 47, 11: 49, 14: 50, 19: 48, 25: 49, 26: 50 },
  6:  { 1: 50, 2: 47, 5: 53, 8: 49, 11: 51, 14: 48, 19: 46, 25: 50, 26: 51 },
  8:  { 1: 51, 2: 50, 5: 53, 6: 51, 11: 52, 14: 50, 19: 51, 25: 52, 26: 53 },
  11: { 1: 48, 2: 49, 5: 52, 6: 49, 8: 48, 14: 47, 19: 49, 25: 50, 26: 51 },
  14: { 1: 55, 2: 51, 5: 51, 6: 52, 8: 50, 11: 53, 19: 51, 25: 52, 26: 51 },
  19: { 1: 52, 2: 50, 5: 53, 6: 55, 8: 49, 11: 52, 14: 49, 25: 51, 26: 52 },
  25: { 1: 47, 2: 49, 5: 52, 6: 50, 8: 48, 11: 51, 14: 49, 19: 50, 26: 51 },
  26: { 1: 46, 2: 52, 5: 51, 6: 50, 8: 48, 11: 50, 14: 50, 19: 49, 25: 50 },
};

const GAMES_PER_PAIR = 1500;

// Item catalog used by the sample builds (ids approximate OpenDota item ids).
const ITEMS: ItemConstant[] = [
  { id: 40, key: 'tango', localizedName: 'Tango' },
  { id: 39, key: 'flask', localizedName: 'Healing Salve' },
  { id: 16, key: 'branches', localizedName: 'Iron Branch' },
  { id: 11, key: 'quelling_blade', localizedName: 'Quelling Blade' },
  { id: 20, key: 'circlet', localizedName: 'Circlet' },
  { id: 237, key: 'faerie_fire', localizedName: 'Faerie Fire' },
  { id: 42, key: 'ward_observer', localizedName: 'Observer Ward' },
  { id: 43, key: 'ward_sentry', localizedName: 'Sentry Ward' },
  { id: 29, key: 'boots', localizedName: 'Boots of Speed' },
  { id: 63, key: 'power_treads', localizedName: 'Power Treads' },
  { id: 50, key: 'phase_boots', localizedName: 'Phase Boots' },
  { id: 36, key: 'magic_wand', localizedName: 'Magic Wand' },
  { id: 75, key: 'wraith_band', localizedName: 'Wraith Band' },
  { id: 145, key: 'bfury', localizedName: 'Battle Fury' },
  { id: 116, key: 'black_king_bar', localizedName: 'Black King Bar' },
  { id: 1, key: 'blink', localizedName: 'Blink Dagger' },
  { id: 137, key: 'manta', localizedName: 'Manta Style' },
  { id: 154, key: 'satanic', localizedName: 'Satanic' },
  { id: 160, key: 'butterfly', localizedName: 'Butterfly' },
  { id: 96, key: 'aghanims_scepter', localizedName: "Aghanim's Scepter" },
  { id: 127, key: 'assault', localizedName: 'Assault Cuirass' },
  { id: 92, key: 'force_staff', localizedName: 'Force Staff' },
  { id: 65, key: 'aether_lens', localizedName: 'Aether Lens' },
  { id: 254, key: 'glimmer_cape', localizedName: 'Glimmer Cape' },
  { id: 108, key: 'shivas_guard', localizedName: "Shiva's Guard" },
];
const itemId = (key: string): number => {
  const it = ITEMS.find((i) => i.key === key);
  if (!it) throw new Error(`Unknown item key: ${key}`);
  return it.id;
};
const bucket = (...entries: [string, number][]): { itemId: number; key: string; count: number }[] =>
  entries.map(([key, count]) => ({ itemId: itemId(key), key, count }));

const BUILDS: Record<SeedHero['build'], HeroItemBuckets> = {
  carry: {
    start: bucket(['tango', 5200], ['quelling_blade', 4800], ['branches', 4300], ['circlet', 2100]),
    early: bucket(['power_treads', 6100], ['magic_wand', 4200], ['wraith_band', 3500], ['bfury', 2600]),
    mid: bucket(['bfury', 4100], ['manta', 3800], ['black_king_bar', 3300], ['blink', 1900]),
    late: bucket(['butterfly', 3200], ['satanic', 2900], ['black_king_bar', 2100]),
  },
  support: {
    start: bucket(['tango', 5000], ['flask', 3900], ['ward_observer', 3600], ['branches', 3100], ['ward_sentry', 2400]),
    early: bucket(['boots', 5400], ['magic_wand', 4700], ['glimmer_cape', 2600], ['force_staff', 2100]),
    mid: bucket(['glimmer_cape', 3300], ['force_staff', 3000], ['aether_lens', 2500], ['blink', 1800]),
    late: bucket(['aghanims_scepter', 2400], ['shivas_guard', 1600]),
  },
  initiator: {
    start: bucket(['tango', 4800], ['quelling_blade', 3600], ['branches', 3400], ['flask', 2600]),
    early: bucket(['boots', 5200], ['magic_wand', 4600], ['phase_boots', 3100]),
    mid: bucket(['blink', 4400], ['black_king_bar', 3600], ['aghanims_scepter', 2200]),
    late: bucket(['assault', 2600], ['shivas_guard', 2300], ['satanic', 1700]),
  },
};

function heroStat(h: SeedHero): HeroStat {
  const legendPick = 40000;
  const wr = h.legendWinrate;
  const round = (n: number) => Math.round(n);
  return {
    heroId: h.id,
    byBracket: {
      herald: { pick: round(legendPick * 1.4), win: round(legendPick * 1.4 * (wr - 1.5) / 100) },
      legend: { pick: legendPick, win: round(legendPick * wr / 100) },
      immortal: { pick: round(legendPick * 0.25), win: round(legendPick * 0.25 * (wr + 1.0) / 100) },
    },
    proPick: round(120 * (wr / 50)),
    proWin: round(60 * (wr / 50)),
    proBan: round(80 * (wr / 50)),
  };
}

function matchupsFor(id: number): Matchup[] {
  const row = WR[id];
  return ORDER.filter((o) => o !== id).map((opp) => {
    const wr = row[opp];
    return { heroId: opp, gamesPlayed: GAMES_PER_PAIR, wins: Math.round(GAMES_PER_PAIR * wr / 100) };
  });
}

const dataset: Dataset = {
  patch: '7.37-sample',
  generatedAt: new Date().toISOString(),
  heroes: HEROES.map<Hero>((h) => ({
    id: h.id,
    name: `npc_dota_hero_${h.name}`,
    localizedName: h.localizedName,
    primaryAttr: h.primaryAttr,
    attackType: h.attackType,
    roles: h.roles,
    img: `${CDN}/${h.name}.png`,
    icon: `${CDN}/icons/${h.name}.png`,
  })),
  stats: HEROES.map(heroStat),
  matchups: Object.fromEntries(HEROES.map((h) => [h.id, matchupsFor(h.id)])),
  itemPopularity: Object.fromEntries(HEROES.map((h) => [h.id, BUILDS[h.build]])),
  itemConstants: Object.fromEntries(ITEMS.map((i) => [i.id, i])),
  // A minimal derived-attribute seed so the field is exercised offline. The
  // curated overlay (heroAttributes.ts) still takes precedence for these heroes.
  heroAttributes: Object.fromEntries(
    HEROES.map((h) => {
      const damageTypes: ('magical' | 'physical' | 'pure')[] =
        h.primaryAttr === 'int' ? ['magical'] : ['physical'];
      return [h.id, { damageTypes }];
    }),
  ),
};

const outDir = resolve(__dirname, '..', 'assets');
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, 'dataset.json');
writeFileSync(outFile, JSON.stringify(dataset, null, 2));
console.log(`Wrote sample dataset with ${dataset.heroes.length} heroes -> ${outFile}`);
