// Hero name search used by the hero picker. Ranks heroes the way a live
// "type to narrow" grid should feel — full-name prefix first, then a prefix
// of any individual word (so "mage" matches "Anti-Mage", "fiend" matches
// "Shadow Fiend"), then a plain substring anywhere as a last resort. Pure and
// testable; no UI imports.

/**
 * Match rank of `localizedName` against `query` (lower = better match).
 * Returns null when there's no match at all. An empty query matches
 * everything with rank 0.
 */
export function heroMatchRank(localizedName: string, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (q === '') return 0;

  const name = localizedName.toLowerCase();
  if (name.startsWith(q)) return 0;

  const words = name.split(/[\s'-]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(q))) return 1;

  if (name.includes(q)) return 2;
  return null;
}

/**
 * Filters `heroes` to those matching `query` and sorts by match quality
 * (best matches first), preserving the incoming relative order within each
 * quality tier — e.g. alphabetical if the input was already alphabetical.
 */
export function filterAndRankHeroes<T extends { localizedName: string }>(
  heroes: T[],
  query: string,
): T[] {
  if (query.trim() === '') return heroes;
  return heroes
    .map((h, index) => ({ h, rank: heroMatchRank(h.localizedName, query), index }))
    .filter((x): x is { h: T; rank: number; index: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.h);
}
