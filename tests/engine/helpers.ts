import { BOARD_SIZE, sidesFor } from '../../src/engine';
import type { GameState, PlayerState, Position, Side, Wall } from '../../src/engine';

export const pos = (row: number, col: number): Position => ({ row, col });
export const h = (row: number, col: number): Wall => ({ orientation: 'h', row, col });
export const v = (row: number, col: number): Wall => ({ orientation: 'v', row, col });

export interface PlayerSpec {
  at: Position;
  side?: Side;
  wallsLeft?: number;
  moves?: number;
}

/** Build an arbitrary state. Sides default to the normal turn order for 2 or 4 players. */
export function makeState(
  players: PlayerSpec[],
  opts: { walls?: Wall[]; turn?: number; winner?: number | null; size?: number } = {},
): GameState {
  const defaults = sidesFor(players.length === 4 ? 4 : 2);
  return {
    size: opts.size ?? BOARD_SIZE,
    players: players.map(
      (p, i): PlayerState => ({
        side: p.side ?? defaults[i] ?? 'bottom',
        position: p.at,
        wallsLeft: p.wallsLeft ?? 10,
        moves: p.moves ?? 0,
      }),
    ),
    walls: opts.walls ?? [],
    turn: opts.turn ?? 0,
    winner: opts.winner ?? null,
  };
}

/** Sorted "r,c" keys so move lists compare regardless of order. */
export const keys = (ps: readonly Position[]): string[] => ps.map((p) => `${p.row},${p.col}`).sort();

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const val of Object.values(o as Record<string, unknown>)) deepFreeze(val);
  }
  return o;
}
