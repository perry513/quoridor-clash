/**
 * Movement, path finding and wall legality.
 */
import { DIRECTIONS, isGoalCell, isMoveBlocked, onBoard, samePosition } from './board';
import type { GameState, Position, Wall, WallCheck } from './types';

const key = (p: Position): string => `${p.row},${p.col}`;

/** Every square the player may move to this turn (deduplicated). */
export function getValidMoves(state: GameState, playerIndex: number = state.turn): Position[] {
  const player = state.players[playerIndex];
  if (!player) return [];
  const { walls, size } = state;
  const occupied = (p: Position): boolean => state.players.some((o) => samePosition(o.position, p));
  const out = new Map<string, Position>();
  const add = (p: Position): void => {
    if (onBoard(p, size) && !occupied(p)) out.set(key(p), p);
  };
  const from = player.position;

  for (const [dr, dc] of DIRECTIONS) {
    if (isMoveBlocked(walls, size, from, dr, dc)) continue;
    const next = { row: from.row + dr, col: from.col + dc };
    if (!occupied(next)) {
      add(next);
      continue;
    }
    // A pawn is next to us: jump straight over it if nothing is behind it.
    const beyond = { row: next.row + dr, col: next.col + dc };
    if (!isMoveBlocked(walls, size, next, dr, dc) && !occupied(beyond)) {
      add(beyond);
      continue;
    }
    // Straight jump blocked (wall, edge or pawn): side-step diagonally.
    const sideways: readonly (readonly [number, number])[] =
      dr !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
    for (const [pr, pc] of sideways) {
      if (!isMoveBlocked(walls, size, next, pr, pc)) add({ row: next.row + pr, col: next.col + pc });
    }
  }
  return [...out.values()];
}

/** BFS from the player's square to their goal edge, ignoring pawns. */
function distanceToGoal(state: GameState, playerIndex: number, walls: readonly Wall[]): number | null {
  const player = state.players[playerIndex];
  if (!player) return null;
  const { size } = state;
  const seen = new Set<string>([key(player.position)]);
  let frontier: Position[] = [player.position];
  for (let dist = 0; frontier.length > 0; dist++) {
    const next: Position[] = [];
    for (const p of frontier) {
      if (isGoalCell(player.side, p, size)) return dist;
      for (const [dr, dc] of DIRECTIONS) {
        if (isMoveBlocked(walls, size, p, dr, dc)) continue;
        const q = { row: p.row + dr, col: p.col + dc };
        const k = key(q);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(q);
        }
      }
    }
    frontier = next;
  }
  return null;
}

/** True when the player can still reach their goal edge (pawns ignored). */
export function hasPathToGoal(
  state: GameState,
  playerIndex: number,
  walls: readonly Wall[] = state.walls,
): boolean {
  return distanceToGoal(state, playerIndex, walls) !== null;
}

/** Fewest steps to the goal edge ignoring pawns, or null when walled off. */
export function shortestPathLength(
  state: GameState,
  playerIndex: number,
  walls: readonly Wall[] = state.walls,
): number | null {
  return distanceToGoal(state, playerIndex, walls);
}

/** True when `wall` would cross or half-overlap a wall already in `walls`. */
export function wallOverlaps(walls: readonly Wall[], wall: Wall): boolean {
  const { orientation: o, row: r, col: c } = wall;
  return walls.some((w) => {
    if (w.row === r && w.col === c) return true; // same slot: identical or crossing
    if (w.orientation !== o) return false;
    return o === 'h'
      ? w.row === r && Math.abs(w.col - c) === 1
      : w.col === c && Math.abs(w.row - r) === 1;
  });
}

/** Can the player whose turn it is build `wall`? */
export function checkWall(state: GameState, wall: Wall): WallCheck {
  const player = state.players[state.turn];
  if (!player || !(player.wallsLeft > 0)) return { ok: false, reason: 'no-walls-left' };
  const max = state.size - 2;
  const inRange = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= max;
  if ((wall.orientation !== 'h' && wall.orientation !== 'v') || !inRange(wall.row) || !inRange(wall.col)) {
    return { ok: false, reason: 'out-of-bounds' };
  }
  if (wallOverlaps(state.walls, wall)) return { ok: false, reason: 'overlap' };
  const trial = [...state.walls, wall];
  for (let i = 0; i < state.players.length; i++) {
    if (!hasPathToGoal(state, i, trial)) return { ok: false, reason: 'blocks-path', trappedPlayer: i };
  }
  return { ok: true };
}

/** A player can take a turn if they can move or still have walls to build. */
export function canAct(state: GameState, playerIndex: number): boolean {
  const p = state.players[playerIndex];
  if (!p) return false;
  return p.wallsLeft > 0 || getValidMoves(state, playerIndex).length > 0;
}
