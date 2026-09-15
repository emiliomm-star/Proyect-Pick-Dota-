/**
 * Calibrates the draft predictor against real pro-match outcomes.
 *
 * Fetches recent pro matches, extracts each draft + winner, computes the same
 * features the predictor uses, fits a logistic regression, and writes the
 * learned coefficients to assets/weights.json.
 *
 * Run in CI or locally where api.opendota.com is reachable:
 *   npx tsx scripts/calibrate.ts
 *
 * Env:
 *   OPENDOTA_API_KEY  raises the rate limit
 *   MAX_MATCHES       how many pro matches to sample (default 400)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Dataset } from '../src/data/types';
import { draftFeatures } from '../src/engine/predict';
import { fitLogistic, accuracy, type Sample } from '../src/engine/calibrate';
import { getAttributes } from '../src/data/heroAttributes';

const BASE = 'https://api.opendota.com/api';
const API_KEY = process.env.OPENDOTA_API_KEY;
const MAX_MATCHES = Number(process.env.MAX_MATCHES ?? 400);
const THROTTLE_MS = API_KEY ? 150 : 1100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${API_KEY ? `${sep}api_key=${API_KEY}` : ''}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { await sleep(2000 * attempt); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === 4) throw err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error(`Failed to fetch ${path}`);
}

interface RawProMatch { match_id: number }
interface RawPickBan { is_pick: boolean; hero_id: number; team: number }
interface RawMatch { radiant_win: boolean; picks_bans?: RawPickBan[] }

async function main() {
  const datasetPath = resolve(__dirname, '..', 'assets', 'dataset.json');
  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as Dataset;

  console.log('Fetching recent pro matches…');
  const proMatches: RawProMatch[] = [];
  let lessThan = '';
  while (proMatches.length < MAX_MATCHES) {
    const page = await getJson<RawProMatch[]>(`/proMatches${lessThan}`);
    if (!page.length) break;
    proMatches.push(...page);
    lessThan = `?less_than_match_id=${page[page.length - 1].match_id}`;
    await sleep(THROTTLE_MS);
  }
  const ids = proMatches.slice(0, MAX_MATCHES).map((m) => m.match_id);
  console.log(`Collected ${ids.length} match ids. Fetching drafts…`);

  const samples: Sample[] = [];
  let processed = 0;
  for (const id of ids) {
    try {
      const match = await getJson<RawMatch>(`/matches/${id}`);
      const pb = match.picks_bans ?? [];
      if (pb.length > 0) {
        const radiant = pb.filter((p) => p.is_pick && p.team === 0).map((p) => p.hero_id);
        const dire = pb.filter((p) => p.is_pick && p.team === 1).map((p) => p.hero_id);
        if (radiant.length === 5 && dire.length === 5) {
          const f = draftFeatures(dataset, radiant, dire, { bracket: 'immortal', attributesFor: getAttributes });
          samples.push({
            features: [f.matchupEdge, f.metaEdge, f.compEdge, f.timingEdge],
            label: match.radiant_win ? 1 : 0,
          });
        }
      }
    } catch (err) {
      console.warn(`  skipped ${id}: ${(err as Error).message}`);
    }
    await sleep(THROTTLE_MS);
    if (++processed % 25 === 0) console.log(`  ${processed}/${ids.length} (usable samples: ${samples.length})`);
  }

  if (samples.length < 50) {
    throw new Error(`Not enough usable samples (${samples.length}); aborting to avoid a bad fit.`);
  }

  console.log(`Fitting logistic regression on ${samples.length} matches…`);
  const fit = fitLogistic(samples, { iterations: 5000, learningRate: 0.3, l2: 0.001 });
  const acc = accuracy(fit, samples);
  console.log(`Train accuracy: ${(acc * 100).toFixed(1)}%`);

  const weights = {
    intercept: fit.intercept,
    matchup: fit.coeffs[0],
    meta: fit.coeffs[1],
    composition: fit.coeffs[2],
    timing: fit.coeffs[3],
    calibratedAt: new Date().toISOString(),
    samples: samples.length,
    trainAccuracy: Number(acc.toFixed(4)),
    note: 'Fit on pro matches. compEdge/timingEdge are weak until heroAttributes covers the full roster.',
  };

  const outFile = resolve(__dirname, '..', 'assets', 'weights.json');
  writeFileSync(outFile, JSON.stringify(weights, null, 2));
  console.log('Wrote', outFile, weights);
}

main().catch((err) => { console.error(err); process.exit(1); });
