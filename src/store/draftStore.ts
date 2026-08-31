import { create } from 'zustand';
import type { Bracket } from '../data/types';
import type { Weights } from '../engine';
import { DEFAULT_WEIGHTS } from '../engine';

export type Team = 'myTeam' | 'enemy' | 'bans';

const TEAM_LIMITS: Record<Team, number> = { myTeam: 5, enemy: 5, bans: 14 };

interface DraftStore {
  myTeam: number[];
  enemy: number[];
  bans: number[];
  bracket: Bracket;
  weights: Weights;

  addHero: (team: Team, heroId: number) => void;
  removeHero: (team: Team, heroId: number) => void;
  reset: () => void;
  setBracket: (bracket: Bracket) => void;
  setWeights: (weights: Partial<Weights>) => void;

  /** Every hero id currently used anywhere in the draft. */
  usedHeroIds: () => Set<number>;
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  myTeam: [],
  enemy: [],
  bans: [],
  bracket: 'legend',
  weights: { ...DEFAULT_WEIGHTS },

  addHero: (team, heroId) =>
    set((state) => {
      if (get().usedHeroIds().has(heroId)) return state;
      const list = state[team];
      if (list.length >= TEAM_LIMITS[team]) return state;
      return { [team]: [...list, heroId] } as Partial<DraftStore>;
    }),

  removeHero: (team, heroId) =>
    set((state) => ({
      [team]: state[team].filter((id) => id !== heroId),
    }) as Partial<DraftStore>),

  reset: () => set({ myTeam: [], enemy: [], bans: [] }),

  setBracket: (bracket) => set({ bracket }),

  setWeights: (weights) =>
    set((state) => ({ weights: { ...state.weights, ...weights } })),

  usedHeroIds: () => {
    const { myTeam, enemy, bans } = get();
    return new Set<number>([...myTeam, ...enemy, ...bans]);
  },
}));

export { TEAM_LIMITS };
