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
  /** Epoch ms when the current step began (shared clock). */
  stepStartedAt: number;
  /** Remaining reserve time (ms) for each team's bank. */
  radiantReserveMs: number;
  direReserveMs: number;
}

/** Base seconds per pick/ban before the reserve bank starts draining. */
export const STEP_SECONDS = 30;
/** Reserve-time bank per team (like Captains Mode), in seconds. */
export const RESERVE_SECONDS = 130;

const BASE_MS = STEP_SECONDS * 1000;

export function initialCaptainsState(now: number = Date.now()): CaptainsState {
  return {
    radiantPicks: [],
    direPicks: [],
    radiantBans: [],
    direBans: [],
    stepIndex: 0,
    stepStartedAt: now,
    radiantReserveMs: RESERVE_SECONDS * 1000,
    direReserveMs: RESERVE_SECONDS * 1000,
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

/** Reserve bank (ms) of a team. */
export function reserveOf(state: CaptainsState, team: DraftTeam): number {
  return team === 'radiant' ? state.radiantReserveMs : state.direReserveMs;
}

/** Epoch ms when the base time (before reserve) runs out for the current step. */
export function baseDeadline(state: CaptainsState): number {
  return state.stepStartedAt + BASE_MS;
}

/** Hard epoch ms deadline = base + the active team's reserve bank. */
export function stepDeadline(state: CaptainsState): number {
  const step = currentStep(state);
  if (!step) return state.stepStartedAt;
  return state.stepStartedAt + BASE_MS + reserveOf(state, step.team);
}

/** Milliseconds left before the hard deadline (base + reserve), never negative. */
export function remainingMs(state: CaptainsState, now: number = Date.now()): number {
  return Math.max(0, stepDeadline(state) - now);
}

/** Milliseconds of base time left (0 once the reserve is draining). */
export function remainingBaseMs(state: CaptainsState, now: number = Date.now()): number {
  return Math.max(0, baseDeadline(state) - now);
}

/** How much reserve the active team has left after the time already spent now. */
export function liveReserveMs(state: CaptainsState, now: number = Date.now()): number {
  const step = currentStep(state);
  if (!step) return 0;
  const overage = Math.max(0, now - baseDeadline(state));
  return Math.max(0, reserveOf(state, step.team) - overage);
}

/** Advance the draft, charging any over-base time to the acting team's reserve. */
function advance(state: CaptainsState, now: number): Pick<
  CaptainsState,
  'stepIndex' | 'stepStartedAt' | 'radiantReserveMs' | 'direReserveMs'
> {
  const step = currentStep(state);
  let radiantReserveMs = state.radiantReserveMs;
  let direReserveMs = state.direReserveMs;
  if (step) {
    const overage = Math.max(0, now - baseDeadline(state));
    if (step.team === 'radiant') radiantReserveMs = Math.max(0, radiantReserveMs - overage);
    else direReserveMs = Math.max(0, direReserveMs - overage);
  }
  return {
    stepIndex: state.stepIndex + 1,
    stepStartedAt: now,
    radiantReserveMs,
    direReserveMs,
  };
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
    ...state,
    radiantPicks: [...state.radiantPicks],
    direPicks: [...state.direPicks],
    radiantBans: [...state.radiantBans],
    direBans: [...state.direBans],
    ...advance(state, now),
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
  return { ...state, ...advance(state, now) };
}

/** How many steps remain of each kind, for progress UI. */
export function remainingSteps(state: CaptainsState): number {
  return Math.max(0, CAPTAINS_SEQUENCE.length - state.stepIndex);
}
