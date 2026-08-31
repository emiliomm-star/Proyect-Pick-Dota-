// Loads the bundled dataset and exposes typed helpers.
//
// The JSON is generated ahead of time (scripts/build-sample-dataset.ts for the
// offline sample, scripts/build-dataset.ts for the real OpenDota data) and
// bundled with the app so no network calls are needed at runtime.

import rawDataset from '../../assets/dataset.json';
import type { Bracket, Dataset, Hero } from './types';
import { BRACKETS } from './types';

export const dataset = rawDataset as unknown as Dataset;

export const heroById: Map<number, Hero> = new Map(
  dataset.heroes.map((h) => [h.id, h]),
);

export function getHero(id: number): Hero | undefined {
  return heroById.get(id);
}

/** Heroes sorted alphabetically for pickers. */
export const heroesSorted: Hero[] = [...dataset.heroes].sort((a, b) =>
  a.localizedName.localeCompare(b.localizedName),
);

/** Brackets that actually have data in this dataset, in ladder order. */
export const availableBrackets: Bracket[] = BRACKETS.filter((b) =>
  dataset.stats.some((s) => s.byBracket?.[b]),
);
