/**
 * Adversarial rule tests: try to break the engine against the official
 * Quoridor rules (9x9, 2p 10 walls / 4p 5 walls, jumps, diagonals, wall
 * legality, path guarantee, win and game-over handling).
 */
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  checkWall,
  createGame,
  getValidMoves,
  hasPathToGoal,
  isMoveBlocked,
  nextTurn,
  shortestPathLength,
} from '../../src/engine';
import type { Action, GameState, Wall } from '../../src/engine';
import { deepFreeze, h, keys, makeState, pos, v } from './helpers';

const two = (walls: Wall[] = []) => makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls });
const ok = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a);
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.state;
};

describe('walls at every edge and corner index', () => {
  it('accepts every in-range slot on an empty board in both orientations (64 x 2)', () => {
    for (let r = 0; r <= 7; r++)
      for (let c = 0; c <= 7; c++) {
        expect(checkWall(two(), h(r, c))).toEqual({ ok: true });
        expect(checkWall(two(), v(r, c))).toEqual({ ok: true });
      }
  });
  it('rejects slot index 8 and -1 along every edge', () => {
    for (let i = 0; i <= 7; i++) {
      for (const w of [h(8, i), h(i, 8), v(8, i), v(i, 8), h(-1, i), h(i, -1), v(-1, i), v(i, -1)])
        expect(checkWall(two(), w)).toEqual({ ok: false, reason: 'out-of-bounds' });
    }
  });
  it('rejects NaN, Infinity, fractional indexes and a bogus orientation', () => {
    const bogus = { orientation: 'x', row: 1, col: 1 } as unknown as Wall;
    for (const w of [h(NaN, 0), v(0, Infinity), h(0.5, 0), bogus])
      expect(checkWall(two(), w)).toEqual({ ok: false, reason: 'out-of-bounds' });
  });
  it('corner walls block exactly the two squares they span', () => {
    // h(0,0): below row 0, cols 0-1
    expect(isMoveBlocked([h(0, 0)], 9, pos(0, 0), 1, 0)).toBe(true);
    expect(isMoveBlocked([h(0, 0)], 9, pos(0, 1), 1, 0)).toBe(true);
    expect(isMoveBlocked([h(0, 0)], 9, pos(0, 2), 1, 0)).toBe(false);
    expect(isMoveBlocked([h(0, 0)], 9, pos(1, 1), -1, 0)).toBe(true);
    // v(7,7): right of col 7, rows 7-8
    expect(isMoveBlocked([v(7, 7)], 9, pos(8, 7), 0, 1)).toBe(true);
    expect(isMoveBlocked([v(7, 7)], 9, pos(7, 8), 0, -1)).toBe(true);
    expect(isMoveBlocked([v(7, 7)], 9, pos(6, 7), 0, 1)).toBe(false);
  });
  it('diagonal, zero and long steps are never legal single steps', () => {
    expect(isMoveBlocked([], 9, pos(4, 4), 1, 1)).toBe(true);
    expect(isMoveBlocked([], 9, pos(4, 4), 0, 0)).toBe(true);
    expect(isMoveBlocked([], 9, pos(4, 4), 2, 0)).toBe(true);
  });
});

describe('crossing, overlap and T-junctions', () => {
  it('rejects crossing at the same intersection in both orders, corners included', () => {
    for (const [a, b] of [
      [h(0, 0), v(0, 0)],
      [v(7, 7), h(7, 7)],
      [h(3, 5), v(3, 5)],
    ] as const)
      expect(checkWall(two([a]), b)).toEqual({ ok: false, reason: 'overlap' });
  });
  it('allows T-junctions and end-touching perpendicular walls', () => {
    // h(4,4) lies on grid line y=5 from x=4 to x=6, midpoint (5,5).
    // v(3,4) / v(5,4) lie on x=5 and end exactly at that midpoint: a T.
    const s = two([h(4, 4)]);
    for (const w of [v(3, 4), v(5, 4), v(3, 3), v(4, 3), v(3, 5), v(4, 5), v(2, 4)])
      expect(checkWall(s, w)).toEqual({ ok: true });
  });
  it('allows parallel walls offset by 2 and stacked parallel neighbours', () => {
    const s = two([h(4, 4)]);
    for (const w of [h(4, 6), h(4, 2), h(3, 4), h(5, 4), h(3, 5)]) expect(checkWall(s, w)).toEqual({ ok: true });
  });
  it('rejects half overlap along the board edges', () => {
    expect(checkWall(two([h(0, 7)]), h(0, 6))).toEqual({ ok: false, reason: 'overlap' });
    expect(checkWall(two([v(7, 0)]), v(6, 0))).toEqual({ ok: false, reason: 'overlap' });
  });
});

describe('jumps and diagonals near corners and goals', () => {
  it('diagonal side-step at the top-left corner when the edge is behind the pawn', () => {
    const s = makeState([{ at: pos(1, 0) }, { at: pos(0, 0) }]);
    expect(keys(getValidMoves(s, 0))).toEqual(keys([pos(0, 1), pos(2, 0), pos(1, 1)]));
  });
  it('diagonal side-step at the bottom-right corner, sideways jump', () => {
    const s = makeState([{ at: pos(8, 7) }, { at: pos(8, 8) }]);
    expect(keys(getValidMoves(s, 0))).toEqual(keys([pos(7, 8), pos(7, 7), pos(8, 6)]));
  });
  it('diagonal side-step respects a wall beside the jumped pawn', () => {
    const s = makeState([{ at: pos(1, 0) }, { at: pos(0, 0) }], { walls: [v(0, 0)] });
    expect(keys(getValidMoves(s, 0))).toEqual(keys([pos(2, 0)]));
  });
  it('straight jump onto the goal row wins immediately and turn stays', () => {
    const s = makeState([{ at: pos(2, 4) }, { at: pos(1, 4) }]);
    const after = ok(s, { type: 'move', to: pos(0, 4) });
    expect(after.winner).toBe(0);
    expect(after.turn).toBe(0);
    expect(after.players[0]?.moves).toBe(1);
  });
  it('diagonal side-step when a wall sits between the jumped pawn and the goal row', () => {
    const s = makeState([{ at: pos(2, 4) }, { at: pos(1, 4) }], { walls: [h(0, 4)] });
    const m = keys(getValidMoves(s, 0));
    expect(m).toContain('1,3');
    expect(m).toContain('1,5');
    expect(m).not.toContain('0,4');
  });
  it('diagonal side-step onto the goal row wins (sideways jump along row 1 -> row 0)', () => {
    // me (1,3), pawn (1,4), wall right of (1,4) -> may step to (0,4) and win
    const s = makeState([{ at: pos(1, 3) }, { at: pos(1, 4) }], { walls: [v(1, 4)] });
    expect(keys(getValidMoves(s, 0))).toContain('0,4');
    expect(ok(s, { type: 'move', to: pos(0, 4) }).winner).toBe(0);
  });
  it('no jump and no diagonal through a wall between me and the pawn', () => {
    const s = makeState([{ at: pos(5, 4) }, { at: pos(4, 4) }], { walls: [h(4, 4)] });
    const m = keys(getValidMoves(s, 0));
    for (const k of ['3,4', '4,3', '4,5', '4,4']) expect(m).not.toContain(k);
  });
  it('no diagonal when the straight jump is open', () => {
    const s = makeState([{ at: pos(5, 4) }, { at: pos(4, 4) }]);
    expect(keys(getValidMoves(s, 0))).toEqual(keys([pos(3, 4), pos(6, 4), pos(5, 3), pos(5, 5)]));
  });
  it('top player jumps the bottom pawn onto row 8 and wins', () => {
    const s = makeState([{ at: pos(7, 4) }, { at: pos(6, 4) }], { turn: 1 });
    expect(ok(s, { type: 'move', to: pos(8, 4) }).winner).toBe(1);
  });
});

describe('4-player pawn chains', () => {
  const four = (at: [number, number][], turn = 0) =>
    makeState(at.map(([r, c]) => ({ at: pos(r, c), wallsLeft: 5 })), { turn });

  it('cannot jump two pawns in a row; side-steps instead', () => {
    const s = four([[6, 4], [5, 4], [4, 4], [0, 0]]);
    expect(keys(getValidMoves(s, 0))).toEqual(keys([pos(5, 3), pos(5, 5), pos(7, 4), pos(6, 3), pos(6, 5)]));
  });
  it('a diagonal never lands on a third pawn', () => {
    const s = four([[6, 4], [5, 4], [4, 4], [5, 3]]);
    const m = keys(getValidMoves(s, 0));
    expect(m).not.toContain('5,3');
    expect(m).toContain('5,5');
  });
  it('a boxed-in player with no walls is skipped by nextTurn', () => {
    const s = makeState(
      [
        { at: pos(4, 4), wallsLeft: 5 },
        { at: pos(3, 4), wallsLeft: 0 },
        { at: pos(4, 3), wallsLeft: 5 },
        { at: pos(4, 5), wallsLeft: 5 },
      ],
      { walls: [h(2, 3), v(3, 3), v(3, 4), h(4, 3)], turn: 0 },
    );
    expect(getValidMoves(s, 1)).toEqual([]);
    expect(nextTurn(s)).toBe(2);
  });
  it('createGame gives 5 walls each and the four edge starts in turn order', () => {
    const g = createGame({ playerCount: 4, wallsPerPlayer: 5, firstPlayer: 0 });
    expect(g.players.map((p) => [p.side, p.position.row, p.position.col, p.wallsLeft])).toEqual([
      ['bottom', 8, 4, 5],
      ['left', 4, 0, 5],
      ['top', 0, 4, 5],
      ['right', 4, 8, 5],
    ]);
  });
  it('left and right players win on the far column', () => {
    const s = makeState([{ at: pos(8, 0) }, { at: pos(4, 7) }, { at: pos(0, 0) }, { at: pos(4, 1) }], { turn: 1 });
    expect(ok(s, { type: 'move', to: pos(4, 8) }).winner).toBe(1);
    expect(ok({ ...s, turn: 3 }, { type: 'move', to: pos(4, 0) }).winner).toBe(3);
  });
  it('blocks-path reports a non-builder, non-adjacent player (index 2) in 4p', () => {
    const s = makeState(
      [
        { at: pos(8, 4), wallsLeft: 5 },
        { at: pos(4, 0), wallsLeft: 5 },
        { at: pos(0, 0), wallsLeft: 5 },
        { at: pos(4, 8), wallsLeft: 5 },
      ],
      { walls: [v(0, 0)], turn: 0 },
    );
    expect(checkWall(s, h(1, 0))).toEqual({ ok: false, reason: 'blocks-path', trappedPlayer: 2 });
  });
});

describe('path guarantee', () => {
  it('pawns never block the path check (only gap is occupied by a pawn)', () => {
    const walls = [h(4, 0), h(4, 2), h(4, 5), h(4, 7)]; // only col 4 open between rows 4 and 5
    const s = makeState([{ at: pos(8, 4) }, { at: pos(4, 4) }], { walls });
    expect(hasPathToGoal(s, 0)).toBe(true);
    expect(shortestPathLength(s, 0)).toBe(8);
    // and a further legal wall elsewhere is still accepted with the pawn in the gap
    expect(checkWall(s, h(1, 0))).toEqual({ ok: true });
  });
  it('rejects the wall that closes the last gap and names the first trapped player', () => {
    const walls = [h(4, 0), h(4, 2), h(4, 4), h(4, 6), v(4, 7)]; // col 8 open, (5,8) cut off on the left
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls });
    expect(hasPathToGoal(s, 0)).toBe(true);
    expect(checkWall(s, h(5, 7))).toEqual({ ok: false, reason: 'blocks-path', trappedPlayer: 0 });
  });
  it('a wall that seals an empty region is allowed', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls: [v(0, 0)] });
    expect(checkWall(s, h(1, 0))).toEqual({ ok: true });
  });
  it('the builder may not trap themselves', () => {
    const s = makeState([{ at: pos(8, 0) }, { at: pos(0, 8) }], { walls: [v(7, 0)] });
    expect(checkWall(s, h(6, 0))).toEqual({ ok: false, reason: 'blocks-path', trappedPlayer: 0 });
  });
});

describe('game over and bad input', () => {
  it('rejects a wall on a won game even though the player still has walls', () => {
    const s = makeState([{ at: pos(0, 4) }, { at: pos(5, 4) }], { winner: 0, turn: 0 });
    expect(applyAction(s, { type: 'wall', wall: h(3, 3) }).ok).toBe(false);
  });
  it('rejects moves after a win, for any player', () => {
    const s = makeState([{ at: pos(0, 4) }, { at: pos(5, 4) }], { winner: 0, turn: 1 });
    expect(applyAction(s, { type: 'move', to: pos(6, 4) }).ok).toBe(false);
  });
  it('an invalid turn index rejects both kinds of action without throwing', () => {
    for (const turn of [-1, 2, 99, 1.5, NaN]) {
      const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { turn });
      expect(applyAction(s, { type: 'move', to: pos(7, 4) }).ok).toBe(false);
      expect(applyAction(s, { type: 'wall', wall: h(3, 3) }).ok).toBe(false);
    }
  });
  it('getValidMoves with an invalid player index returns []', () => {
    expect(getValidMoves(two(), 5)).toEqual([]);
    expect(getValidMoves(two(), -1)).toEqual([]);
  });
  it('rejects moving onto own square, off board, diagonally, two squares, or fractional', () => {
    for (const to of [pos(8, 4), pos(9, 4), pos(7, 3), pos(6, 4), pos(8, 5.5)])
      expect(applyAction(two(), { type: 'move', to }).ok).toBe(false);
  });
  it('never mutates a frozen input state', () => {
    const s = deepFreeze(two());
    const a = ok(s, { type: 'wall', wall: h(3, 3) });
    const b = ok(a, { type: 'move', to: pos(1, 4) });
    expect(s.walls).toEqual([]);
    expect(b.walls).toEqual([h(3, 3)]);
  });
  it('stores a clean copy of the wall (no aliasing of the caller object)', () => {
    const w = { orientation: 'h' as const, row: 3, col: 3 };
    const a = ok(two(), { type: 'wall', wall: w });
    w.row = 0;
    expect(a.walls[0]).toEqual(h(3, 3));
  });
  it('no-walls-left wins over other rejection reasons', () => {
    const s = makeState([{ at: pos(8, 4), wallsLeft: 0 }, { at: pos(0, 4) }]);
    expect(checkWall(s, h(99, 99))).toEqual({ ok: false, reason: 'no-walls-left' });
  });
  it('a wall decrements only the builder and passes the turn', () => {
    const a = ok(two(), { type: 'wall', wall: h(3, 3) });
    expect(a.players.map((p) => p.wallsLeft)).toEqual([9, 10]);
    expect(a.turn).toBe(1);
  });
  it('createGame normalises firstPlayer to a valid index', () => {
    for (const fp of [0, 1, 2, -1, 5, 3.7]) {
      const g = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: fp });
      expect([0, 1]).toContain(g.turn);
    }
  });
  it('createGame with a NaN firstPlayer still yields a playable turn index', () => {
    const g = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: NaN });
    expect([0, 1]).toContain(g.turn);
  });
  it('a NaN wallsPerPlayer never grants unlimited walls', () => {
    const g = createGame({ playerCount: 2, wallsPerPlayer: NaN, firstPlayer: 0 });
    expect(checkWall(g, h(3, 3)).ok).toBe(false);
  });
});
