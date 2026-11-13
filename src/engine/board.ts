/**
 * Board geometry: sides, start positions, goals and wall blocking.
 * Pure functions only — no DOM.
 */
import { BOARD_SIZE } from './types';
import type { PlayerState, Position, Side, Wall } from './types';

/** The four orthogonal steps: up, down, left, right. */
export const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Sides in turn order for a given player count. */
export function sidesFor(playerCount: 2 | 4): Side[] {
  return playerCount === 2 ? ['bottom', 'top'] : ['bottom', 'left', 'top', 'right'];
}

/** Where a player on `side` starts: the middle of that edge. */
export function startPosition(side: Side, size: number = BOARD_SIZE): Position {
  const mid = Math.floor(size / 2);
  switch (side) {
    case 'bottom':
      return { row: size - 1, col: mid };
    case 'top':
      return { row: 0, col: mid };
    case 'left':
      return { row: mid, col: 0 };
    case 'right':
      return { row: mid, col: size - 1 };
  }
}

/** True when `pos` lies on the goal edge for a player who started on `side` (the opposite edge). */
export function isGoalCell(side: Side, pos: Position, size: number = BOARD_SIZE): boolean {
  switch (side) {
    case 'bottom':
      return pos.row === 0;
    case 'top':
      return pos.row === size - 1;
    case 'left':
      return pos.col === size - 1;
    case 'right':
      return pos.col === 0;
  }
}

/** True when the player stands on their goal edge. */
export function goalReached(player: PlayerState, size: number = BOARD_SIZE): boolean {
  return isGoalCell(player.side, player.position, size);
}

export function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function onBoard(pos: Position, size: number): boolean {
  return pos.row >= 0 && pos.row < size && pos.col >= 0 && pos.col < size;
}

export function sameWall(a: Wall, b: Wall): boolean {
  return a.orientation === b.orientation && a.row === b.row && a.col === b.col;
}

function hasWall(walls: readonly Wall[], orientation: Wall['orientation'], row: number, col: number): boolean {
  return walls.some((w) => w.orientation === orientation && w.row === row && w.col === col);
}

/**
 * True when one orthogonal step from `from` by (dRow, dCol) is impossible
 * because it leaves the board or crosses a wall. Non-unit steps count as blocked.
 */
export function isMoveBlocked(
  walls: readonly Wall[],
  size: number,
  from: Position,
  dRow: number,
  dCol: number,
): boolean {
  const { row: r, col: c } = from;
  if (!onBoard({ row: r + dRow, col: c + dCol }, size)) return true;
  if (dRow === 1 && dCol === 0) return hasWall(walls, 'h', r, c) || hasWall(walls, 'h', r, c - 1);
  if (dRow === -1 && dCol === 0) return hasWall(walls, 'h', r - 1, c) || hasWall(walls, 'h', r - 1, c - 1);
  if (dCol === 1 && dRow === 0) return hasWall(walls, 'v', r, c) || hasWall(walls, 'v', r - 1, c);
  if (dCol === -1 && dRow === 0) return hasWall(walls, 'v', r, c - 1) || hasWall(walls, 'v', r - 1, c - 1);
  return true;
}
