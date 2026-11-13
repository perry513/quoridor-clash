/**
 * Pure game-rule types. Nothing in src/engine may touch the DOM, so the
 * engine can be unit-tested and later reused by a computer opponent.
 */

export const BOARD_SIZE = 9;

export interface Position {
  row: number; // 0 = top edge
  col: number; // 0 = left edge
}

/** Which board edge a player starts on. Their goal is the opposite edge. */
export type Side = 'bottom' | 'left' | 'top' | 'right';

export type Orientation = 'h' | 'v';

/**
 * A wall sits on the grid intersection (row, col), 0..BOARD_SIZE-2, and spans two cells.
 * 'h': in the gap below row `row`, covering columns col and col+1.
 * 'v': in the gap right of column `col`, covering rows row and row+1.
 */
export interface Wall {
  orientation: Orientation;
  row: number;
  col: number;
}

export interface PlayerState {
  side: Side;
  position: Position;
  wallsLeft: number;
  /** Number of pawn moves made (for the win screen). */
  moves: number;
}

export interface GameConfig {
  playerCount: 2 | 4;
  wallsPerPlayer: number;
  /** Index of the player who moves first. */
  firstPlayer: number;
}

export interface GameState {
  readonly size: number;
  readonly players: readonly PlayerState[];
  readonly walls: readonly Wall[];
  readonly turn: number;
  /** Index of the winning player, or null while the game is running. */
  readonly winner: number | null;
}

export type Action =
  | { type: 'move'; to: Position }
  | { type: 'wall'; wall: Wall };

export type WallRejection =
  | { ok: false; reason: 'no-walls-left' }
  | { ok: false; reason: 'out-of-bounds' }
  | { ok: false; reason: 'overlap' }
  | { ok: false; reason: 'blocks-path'; trappedPlayer: number };

export type WallCheck = { ok: true } | WallRejection;

export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };
