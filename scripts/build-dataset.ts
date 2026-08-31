/**
 * Builds assets/dataset.json from OpenDota's public API.
 *
 * Run locally or in CI where api.opendota.com is reachable:
 *   npx tsx scripts/build-dataset.ts
 *
 * Optional: set OPENDOTA_API_KEY to raise the rate limit (the free tier is
 * ~60 requests/minute, so a full run of ~124 heroes x 2 calls takes a few
 * minutes with the default throttle).
 *
 * NOTE: This script is NOT run in every dev sandbox because some environments
 * block outbound access to api.opendota.com. Use scripts/build-sample-dataset.ts
 * to work offline.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  Bracket,
  Dataset,
  Hero,
  HeroItemBuckets,
  HeroStat,
  ItemConstant,
  ItemCount,
  Matchup,
} from '../src/data/types';

const BASE = 'https://api.opendota.com/api';
const API_KEY = process.env.OPENDOTA_API_KEY;
const IMG_CDN = 'https://cdn.cloudflare.steamstatic.com';
const THROTTLE_MS = API_KEY ? 150 : 1100;

const BRACKET_BY_TIER: Record<number, Bracket> = {
  1: 'herald',
  2: 'guardian',
  3: 'crusader',
  4: 'archon',
  5: 'legend',
  6: 'ancient',
  7: 'divine',
  8: 'immortal',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${API_KEY ? `${sep}api_key=${API_KEY}` : ''}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        await sleep(2000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === 4) throw err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error(`Failed to fetch ${path}`);
}

function absUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${IMG_CDN}${pathOrUrl}`;
}

// --- OpenDota response shapes (only the fields we use) ---
interface RawHeroStat {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
  img: string;
  icon: string;
  pro_pick?: number;
  pro_win?: number;
  pro_ban?: number;
  [key: string]: unknown; // 1_pick, 1_win, ... 8_pick, 8_win
}

interface RawMatchup {
  hero_id: number;
  games_played: number;
  wins: number;
}

interface RawItemPopularity {
  start_game_items: Record<string, number>;
  early_game_items: Record<string, number>;
  mid_game_items: Record<string, number>;
  late_game_items: Record<string, number>;
}

interface RawItemConstant {
  id: number;
  dname?: string;
  img?: string;
}

function toBucket(map: Record<string, number>, keyById: Map<number, string>): ItemCount[] {
  return Object.entries(map || {})
    .map(([id, count]) => {
      const itemId = Number(id);
      return { itemId, key: keyById.get(itemId) ?? String(itemId), count };
    })
    .sort((a, b) => b.count - a.count);
}

async function main() {
  console.log(`Fetching hero stats${API_KEY ? ' (with API key)' : ''}…`);
  const rawHeroes = await getJson<RawHeroStat[]>('/heroStats');

  console.log('Fetching item constants…');
  const rawItems = await getJson<Record<string, RawItemConstant>>('/constants/items');

  const itemConstants: Record<number, ItemConstant> = {};
  const keyById = new Map<number, string>();
  for (const [key, item] of Object.entries(rawItems)) {
    if (!item || typeof item.id !== 'number') continue;
    keyById.set(item.id, key);
    itemConstants[item.id] = {
      id: item.id,
      key,
      localizedName: item.dname ?? key,
      img: absUrl(item.img),
    };
  }

  let patch = 'unknown';
  try {
    const patches = await getJson<{ name: string }[]>('/constants/patch');
    if (Array.isArray(patches) && patches.length) patch = patches[patches.length - 1].name;
  } catch {
    /* patch is best-effort */
  }

  const heroes: Hero[] = [];
  const stats: HeroStat[] = [];
  for (const h of rawHeroes) {
    heroes.push({
      id: h.id,
      name: h.name,
      localizedName: h.localized_name,
      primaryAttr: (h.primary_attr as Hero['primaryAttr']) ?? 'all',
      attackType: (h.attack_type as Hero['attackType']) ?? 'Melee',
      roles: h.roles ?? [],
      img: absUrl(h.img),
      icon: absUrl(h.icon),
    });

    const byBracket: HeroStat['byBracket'] = {};
    for (const [tier, bracket] of Object.entries(BRACKET_BY_TIER)) {
      const pick = Number(h[`${tier}_pick`] ?? 0);
      const win = Number(h[`${tier}_win`] ?? 0);
      if (pick > 0) byBracket[bracket] = { pick, win };
    }
    stats.push({
      heroId: h.id,
      byBracket,
      proPick: h.pro_pick ?? 0,
      proWin: h.pro_win ?? 0,
      proBan: h.pro_ban ?? 0,
    });
  }

  const matchups: Record<number, Matchup[]> = {};
  const itemPopularity: Record<number, HeroItemBuckets> = {};

  let done = 0;
  for (const hero of heroes) {
    const rawMatchups = await getJson<RawMatchup[]>(`/heroes/${hero.id}/matchups`);
    matchups[hero.id] = rawMatchups.map((m) => ({
      heroId: m.hero_id,
      gamesPlayed: m.games_played,
      wins: m.wins,
    }));
    await sleep(THROTTLE_MS);

    const rawPop = await getJson<RawItemPopularity>(`/heroes/${hero.id}/itemPopularity`);
    itemPopularity[hero.id] = {
      start: toBucket(rawPop.start_game_items, keyById),
      early: toBucket(rawPop.early_game_items, keyById),
      mid: toBucket(rawPop.mid_game_items, keyById),
      late: toBucket(rawPop.late_game_items, keyById),
    };
    await sleep(THROTTLE_MS);

    done += 1;
    if (done % 10 === 0 || done === heroes.length) {
      console.log(`  ${done}/${heroes.length} heroes processed`);
    }
  }

  const dataset: Dataset = {
    patch,
    generatedAt: new Date().toISOString(),
    heroes,
    stats,
    matchups,
    itemPopularity,
    itemConstants,
  };

  const outDir = resolve(__dirname, '..', 'assets');
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, 'dataset.json');
  writeFileSync(outFile, JSON.stringify(dataset));
  console.log(`Done. Wrote ${heroes.length} heroes (patch ${patch}) -> ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
