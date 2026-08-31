// Resolves a hero's popular item builds (per game phase) into display-ready data.

import type { Dataset, HeroItemBuckets, ItemCount } from '../data/types';

export interface ResolvedItem {
  itemId: number;
  key: string;
  name: string;
  count: number;
  /** Fraction of the phase's total picks this item represents (0..1). */
  share: number;
}

export type Phase = 'start' | 'early' | 'mid' | 'late';

export interface HeroBuild {
  start: ResolvedItem[];
  early: ResolvedItem[];
  mid: ResolvedItem[];
  late: ResolvedItem[];
}

const PHASES: Phase[] = ['start', 'early', 'mid', 'late'];

function resolveBucket(
  dataset: Dataset,
  items: ItemCount[],
  topN: number,
): ResolvedItem[] {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  return [...items]
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((i) => ({
      itemId: i.itemId,
      key: i.key,
      name: dataset.itemConstants[i.itemId]?.localizedName ?? i.key,
      count: i.count,
      share: i.count / total,
    }));
}

/**
 * Returns the hero's popular build split into phases, or null if there is no
 * item data for the hero. `topN` caps how many items are kept per phase.
 */
export function itemBuildFor(
  dataset: Dataset,
  heroId: number,
  topN = 4,
): HeroBuild | null {
  const buckets: HeroItemBuckets | undefined = dataset.itemPopularity[heroId];
  if (!buckets) return null;

  const build = {} as HeroBuild;
  for (const phase of PHASES) {
    build[phase] = resolveBucket(dataset, buckets[phase] ?? [], topN);
  }
  return build;
}
