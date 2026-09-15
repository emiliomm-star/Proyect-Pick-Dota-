// Turn-based Captains-Mode-style draft sequence for the local 2-captain arena.
// Pure and testable; no UI imports.
//
// The sequence is a simplified, recognizable ban/pick order (not Valve's exact
// current order) that yields 5 picks + 5 bans per side and alternates turns so
// two captains can train drafting on one device.

export type DraftAction = 'ban' | 'pick';
export type DraftTeam = 'radiant' | 'dire';

export interface DraftStep {
  team: DraftTeam;
  action: DraftAction;
}

const R = (action: DraftAction): DraftStep => ({ team: 'radiant', action });
const D = (action: DraftAction): DraftStep => ({ team: 'dire', action });

export const CAPTAINS_SEQUENCE: DraftStep[] = [
  // Ban phase 1
  R('ban'), D('ban'), R('ban'), D('ban'),
  // Pick phase 1
  R('pick'), D('pick'), D('pick'), R('pick'),
  // Ban phase 2
  R('ban'), D('ban'), R('ban'), D('ban'),
  // Pick phase 2
  R('pick'), D('pick'), D('pick'), R('pick'),
  // Ban phase 3
  R('ban'), D('ban'),
  // Pick phase 3
  R('pick'), D('pick'),
];

export interface CaptainsState {
  radiantPicks: number[];
  direPicks: number[];
  radiantBans: number[];
  direBans: number[];
  stepIndex: number;
  /** Epoch ms by which the CURRENT step must be completed (shared clock). */
  deadline: number;
}

/** Seconds allowed per pick/ban (Captains-Mode-style countdown). */
export const STEP_SECONDS = 30;

function nextDeadline(now: number): number {
  return now + STEP_SECONDS * 1000;
}

export function initialCaptainsState(now: number = Date.now()): CaptainsState {
  return {
    radiantPicks: [],
    direPicks: [],
    radiantBans: [],
    direBans: [],
    stepIndex: 0,
    deadline: nextDeadline(now),
  };
}

export function currentStep(state: CaptainsState): DraftStep | null {
  return state.stepIndex < CAPTAINS_SEQUENCE.length ? CAPTAINS_SEQUENCE[state.stepIndex] : null;
}

export function isComplete(state: CaptainsState): boolean {
  return state.stepIndex >= CAPTAINS_SEQUENCE.length;
}

/** All hero ids already used anywhere in the draft. */
export function usedHeroes(state: CaptainsState): Set<number> {
  return new Set<number>([
    ...state.radiantPicks,
    ...state.direPicks,
    ...state.radiantBans,
    ...state.direBans,
  ]);
}

/**
 * Apply the current step by choosing `heroId`. Returns a NEW state.
 * No-op (returns the same state) if the draft is complete or the hero is used.
 */
export function applyChoice(
  state: CaptainsState,
  heroId: number,
  now: number = Date.now(),
): CaptainsState {
  const step = currentStep(state);
  if (!step || usedHeroes(state).has(heroId)) return state;

  const next: CaptainsState = {
    radiantPicks: [...state.radiantPicks],
    direPicks: [...state.direPicks],
    radiantBans: [...state.radiantBans],
    direBans: [...state.direBans],
    stepIndex: state.stepIndex + 1,
    deadline: nextDeadline(now),
  };

  if (step.action === 'pick') {
    (step.team === 'radiant' ? next.radiantPicks : next.direPicks).push(heroId);
  } else {
    (step.team === 'radiant' ? next.radiantBans : next.direBans).push(heroId);
  }
  return next;
}

/**
 * Advance without choosing (e.g. a ban whose timer ran out). Returns a NEW
 * state. No-op if the draft is complete.
 */
export function skipStep(state: CaptainsState, now: number = Date.now()): CaptainsState {
  if (isComplete(state)) return state;
  return { ...state, stepIndex: state.stepIndex + 1, deadline: nextDeadline(now) };
}

/** Milliseconds left for the current step (never negative). */
export function remainingMs(state: CaptainsState, now: number = Date.now()): number {
  return Math.max(0, state.deadline - now);
}

/** How many steps remain of each kind, for progress UI. */
export function remainingSteps(state: CaptainsState): number {
  return Math.max(0, CAPTAINS_SEQUENCE.length - state.stepIndex);
}
