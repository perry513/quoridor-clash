/**
 * Game lifecycle: creating a game and applying actions. States are
 * immutable: every action returns a fresh GameState and never edits its input.
 */
import { goalReached, samePosition, sidesFor, startPosition } from './board';
import { MESSAGES, describeWallRejection } from './messages';
import { canAct, checkWall, getValidMoves } from './rules';
import { BOARD_SIZE } from './types';
import type { Action, ActionResult, GameConfig, GameState, PlayerState } from './types';

export function createGame(config: GameConfig): GameState {
  const sides = sidesFor(config.playerCount);
  const n = sides.length;
  // Guard against bad input (NaN, Infinity, fractions, negatives) so the engine stays playable.
  const fp = Number.isFinite(config.firstPlayer) ? Math.trunc(config.firstPlayer) : 0;
  const first = ((fp % n) + n) % n;
  const w = config.wallsPerPlayer;
  const wallsPerPlayer = Number.isFinite(w) ? Math.max(0, Math.floor(w)) : 0;
  return {
    size: BOARD_SIZE,
    players: sides.map((side) => ({
      side,
      position: startPosition(side, BOARD_SIZE),
      wallsLeft: wallsPerPlayer,
      moves: 0,
    })),
    walls: [],
    turn: first,
    winner: null,
  };
}

/**
 * The player after `state.turn` who can act (move or build), skipping anyone
 * boxed in with no walls. Checks each player at most once, so it never loops.
 */
export function nextTurn(state: GameState): number {
  const n = state.players.length;
  let t = state.turn;
  for (let k = 0; k < n; k++) {
    t = (t + 1) % n;
    if (canAct(state, t)) return t;
  }
  return (state.turn + 1) % n;
}

/**
 * Players whose turn was skipped between two consecutive states, in order
 * (for a "boxed in and skips a turn" message).
 */
export function skippedPlayers(before: GameState, after: GameState): number[] {
  if (after.winner !== null) return [];
  const n = before.players.length;
  const out: number[] = [];
  for (let t = (before.turn + 1) % n; t !== after.turn && out.length < n; t = (t + 1) % n) out.push(t);
  return out;
}

const defaultName = (i: number): string => `Player ${i + 1}`;

/**
 * Validate and apply an action for the player whose turn it is.
 * `nameOf` is only used to word the "would trap X" message.
 */
export function applyAction(
  state: GameState,
  action: Action,
  nameOf: (i: number) => string = defaultName,
): ActionResult {
  if (state.winner !== null) return { ok: false, error: MESSAGES.gameOver };
  const current = state.players[state.turn];
  if (!current) return { ok: false, error: MESSAGES.badMove };

  if (action.type === 'move') {
    const to = action.to;
    if (!getValidMoves(state).some((p) => samePosition(p, to))) return { ok: false, error: MESSAGES.badMove };
    const moved: PlayerState = { ...current, position: { row: to.row, col: to.col }, moves: current.moves + 1 };
    const players = state.players.map((p, i) => (i === state.turn ? moved : p));
    if (goalReached(moved, state.size)) return { ok: true, state: { ...state, players, winner: state.turn } };
    const next: GameState = { ...state, players };
    return { ok: true, state: { ...next, turn: nextTurn(next) } };
  }

  const check = checkWall(state, action.wall);
  if (!check.ok) return { ok: false, error: describeWallRejection(check, nameOf) };
  const { orientation, row, col } = action.wall;
  const players = state.players.map((p, i) => (i === state.turn ? { ...p, wallsLeft: p.wallsLeft - 1 } : p));
  const next: GameState = { ...state, players, walls: [...state.walls, { orientation, row, col }] };
  return { ok: true, state: { ...next, turn: nextTurn(next) } };
}
