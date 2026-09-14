import { describe, expect, it } from 'vitest';
import { mergeAttributes } from './heroAttributes';

describe('mergeAttributes', () => {
  it('returns neutral defaults with no seed or overlay', () => {
    const a = mergeAttributes();
    expect(a.damageTypes).toEqual(['physical']);
    expect(a.hardDisable).toBe(false);
  });

  it('applies the pipeline seed over neutral', () => {
    const a = mergeAttributes({ damageTypes: ['magical'], hardDisable: true });
    expect(a.damageTypes).toEqual(['magical']);
    expect(a.hardDisable).toBe(true);
  });

  it('lets the curated overlay win over the seed', () => {
    const a = mergeAttributes(
      { damageTypes: ['magical'], hardDisable: false, escape: true },
      { damageTypes: ['physical'], hardDisable: true },
    );
    expect(a.damageTypes).toEqual(['physical']); // curated wins
    expect(a.hardDisable).toBe(true); // curated wins
    expect(a.escape).toBe(true); // kept from seed (overlay didn't set it)
  });
});
