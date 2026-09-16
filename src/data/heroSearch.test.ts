import { describe, expect, it } from 'vitest';
import { filterAndRankHeroes, heroMatchRank } from './heroSearch';

describe('heroMatchRank', () => {
  it('ranks empty query as a match for everything (rank 0)', () => {
    expect(heroMatchRank('Anti-Mage', '')).toBe(0);
    expect(heroMatchRank('Anti-Mage', '   ')).toBe(0);
  });

  it('ranks a full-name prefix match best (0)', () => {
    expect(heroMatchRank('Anti-Mage', 'ant')).toBe(0);
    expect(heroMatchRank('Anti-Mage', 'Anti-Mage')).toBe(0);
  });

  it('ranks a word-start match second (1)', () => {
    expect(heroMatchRank('Anti-Mage', 'mage')).toBe(1);
    expect(heroMatchRank('Shadow Fiend', 'fiend')).toBe(1);
  });

  it('ranks a substring-only match last (2)', () => {
    expect(heroMatchRank('Anti-Mage', 'ti-m')).toBe(2);
  });

  it('returns null for no match', () => {
    expect(heroMatchRank('Anti-Mage', 'zzz')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(heroMatchRank('Anti-Mage', 'ANTI')).toBe(0);
  });
});

describe('filterAndRankHeroes', () => {
  const heroes = [
    { id: 1, localizedName: 'Anti-Mage' },
    { id: 2, localizedName: 'Shadow Fiend' },
    { id: 3, localizedName: 'Ancient Apparition' },
    { id: 4, localizedName: 'Tinker' },
  ];

  it('returns everything unchanged for an empty query', () => {
    expect(filterAndRankHeroes(heroes, '')).toEqual(heroes);
  });

  it('narrows down as more letters are typed (progressively fewer/equal results)', () => {
    const a = filterAndRankHeroes(heroes, 'an');
    const an_ = filterAndRankHeroes(heroes, 'anc');
    expect(a.length).toBeGreaterThanOrEqual(an_.length);
    expect(an_.every((h) => a.some((x) => x.id === h.id))).toBe(true);
  });

  it('prioritizes prefix matches over substring matches', () => {
    // 'an' is a prefix of Anti-Mage and Ancient Apparition (rank 0), not of Shadow Fiend/Tinker.
    const results = filterAndRankHeroes(heroes, 'an');
    expect(results.map((h) => h.id)).toEqual([1, 3]);
  });

  it('finds a hero by a later word in its name', () => {
    const results = filterAndRankHeroes(heroes, 'mage');
    expect(results.map((h) => h.id)).toEqual([1]);
  });

  it('excludes non-matching heroes entirely', () => {
    const results = filterAndRankHeroes(heroes, 'zzz');
    expect(results).toEqual([]);
  });
});
