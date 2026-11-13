import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  applyAction,
  canAct,
  checkWall,
  createGame,
  getValidMoves,
  nextTurn,
  shortestPathLength,
  skippedPlayers,
} from '../../src/engine';
import type { Action, GameState } from '../../src/engine';
import { deepFreeze, h, makeState, pos, v } from './helpers';

function play(state: GameState, ...actions: Action[]): GameState {
  let s = state;
  for (const a of actions) {
    const r = applyAction(s, a);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return s;
}
const move = (row: number, col: number): Action => ({ type: 'move', to: pos(row, col) });

describe('createGame', () => {
  it('sets up 2 players', () => {
    const s = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 });
    expect(s.size).toBe(BOARD_SIZE);
    expect(s.walls).toEqual([]);
    expect(s.winner).toBeNull();
    expect(s.turn).toBe(0);
    expect(s.players).toEqual([
      { side: 'bottom', position: pos(8, 4), wallsLeft: 10, moves: 0 },
      { side: 'top', position: pos(0, 4), wallsLeft: 10, moves: 0 },
    ]);
  });

  it('sets up 4 players with the chosen first player and wall count', () => {
    const s = createGame({ playerCount: 4, wallsPerPlayer: 5, firstPlayer: 2 });
    expect(s.turn).toBe(2);
    expect(s.players.map((p) => p.side)).toEqual(['bottom', 'left', 'top', 'right']);
    expect(s.players.map((p) => p.position)).toEqual([pos(8, 4), pos(4, 0), pos(0, 4), pos(4, 8)]);
    expect(s.players.every((p) => p.wallsLeft === 5)).toBe(true);
  });

  it('wraps an out-of-range first player', () => {
    expect(createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 3 }).turn).toBe(1);
    expect(createGame({ playerCount: 4, wallsPerPlayer: 10, firstPlayer: -1 }).turn).toBe(3);
  });
});

describe('turn order', () => {
  it('alternates in a 2-player game', () => {
    let s = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 });
    s = play(s, move(7, 4));
    expect(s.turn).toBe(1);
    s = play(s, move(1, 4));
    expect(s.turn).toBe(0);
  });

  it('starts with player 2 when chosen', () => {
    let s = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 1 });
    s = play(s, move(1, 4));
    expect(s.turn).toBe(0);
  });

  it('cycles bottom, left, top, right in a 4-player game', () => {
    let s = createGame({ playerCount: 4, wallsPerPlayer: 5, firstPlayer: 0 });
    const seen: number[] = [s.turn];
    s = play(s, move(7, 4));
    seen.push(s.turn);
    s = play(s, move(4, 1));
    seen.push(s.turn);
    s = play(s, { type: 'wall', wall: h(4, 0) });
    seen.push(s.turn);
    s = play(s, move(4, 7));
    seen.push(s.turn);
    expect(seen).toEqual([0, 1, 2, 3, 0]);
  });

  it('counts moves per player but not walls', () => {
    let s = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 });
    s = play(s, move(7, 4), { type: 'wall', wall: h(4, 4) }, move(6, 4));
    expect(s.players[0]?.moves).toBe(2);
    expect(s.players[1]?.moves).toBe(0);
  });
});

describe('skipping boxed-in players', () => {
  // Left player (1) in the corner (0,0) with no walls: below is walled by h(0,0), to the right are
  // pawns at (0,1) and (0,2) so it cannot step, jump, or side-step.
  const boxed = () =>
    makeState(
      [
        { at: pos(8, 4) },
        { at: pos(0, 0), wallsLeft: 0 },
        { at: pos(0, 1) },
        { at: pos(0, 2) },
      ],
      { walls: [h(0, 0)], turn: 0 },
    );

  it('detects a player who cannot act', () => {
    const s = boxed();
    expect(getValidMoves(s, 1)).toEqual([]);
    expect(canAct(s, 1)).toBe(false);
    expect(canAct(s, 2)).toBe(true);
  });

  it('a boxed-in player with walls can still act', () => {
    const s0 = boxed();
    const s: GameState = { ...s0, players: s0.players.map((p, i) => (i === 1 ? { ...p, wallsLeft: 1 } : p)) };
    expect(canAct(s, 1)).toBe(true);
    expect(nextTurn(s)).toBe(1);
  });

  it('skips them and reports who was skipped', () => {
    const before = boxed();
    const after = play(before, move(7, 4));
    expect(after.turn).toBe(2);
    expect(skippedPlayers(before, after)).toEqual([1]);
  });

  it('reports no skips for a normal turn', () => {
    const before = createGame({ playerCount: 4, wallsPerPlayer: 5, firstPlayer: 0 });
    expect(skippedPlayers(before, play(before, move(7, 4)))).toEqual([]);
  });

  it('never loops forever when nobody can act', () => {
    // A 2x2 board packed with four pawns and no walls: nobody can do anything.
    const s = makeState(
      [
        { at: pos(1, 0), wallsLeft: 0 },
        { at: pos(0, 0), wallsLeft: 0 },
        { at: pos(0, 1), wallsLeft: 0 },
        { at: pos(1, 1), wallsLeft: 0 },
      ],
      { size: 2, turn: 2 },
    );
    expect([0, 1, 2, 3].some((i) => canAct(s, i))).toBe(false);
    expect(nextTurn(s)).toBe(3);
  });
});

describe('winning', () => {
  it.each([
    ['bottom', 0, pos(1, 4), move(0, 4)],
    ['left', 1, pos(4, 7), move(4, 8)],
    ['top', 2, pos(7, 4), move(8, 4)],
    ['right', 3, pos(4, 1), move(4, 0)],
  ] as const)('%s player wins on reaching the far edge', (_side, idx, from, action) => {
    const starts = [pos(8, 0), pos(2, 0), pos(0, 0), pos(2, 8)];
    starts[idx] = from;
    const s = makeState(starts.map((at) => ({ at })), { turn: idx });
    const after = play(s, action);
    expect(after.winner).toBe(idx);
    expect(after.turn).toBe(idx);
    expect(after.players[idx]?.moves).toBe(1);
  });

  it('wins in a 2-player game by a jump', () => {
    const s = makeState([{ at: pos(2, 4) }, { at: pos(1, 4) }]);
    expect(play(s, move(0, 4)).winner).toBe(0);
  });

  it('rejects any action after the game is won', () => {
    const s = makeState([{ at: pos(0, 4) }, { at: pos(5, 4) }], { winner: 0, turn: 0 });
    expect(applyAction(s, move(1, 4)).ok).toBe(false);
    expect(applyAction(s, { type: 'wall', wall: h(4, 4) }).ok).toBe(false);
  });

  it('does not end the game when stepping off the goal edge sideways', () => {
    const s = makeState([{ at: pos(8, 3) }, { at: pos(0, 4) }]);
    expect(play(s, move(8, 2)).winner).toBeNull();
  });
});

describe('invalid actions', () => {
  const s = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 });
  it.each([move(6, 4), move(7, 3), move(8, 4), move(0, 4), move(-1, 4)])('rejects move to %o', (a) => {
    expect(applyAction(s, a)).toEqual({ ok: false, error: 'Pick one of the glowing squares.' });
  });
  it('rejects walls with a friendly message', () => {
    const r = applyAction(s, { type: 'wall', wall: v(8, 0) });
    expect(r).toEqual({ ok: false, error: 'Walls go in the gaps inside the board.' });
  });
});

describe('immutability', () => {
  it('never mutates the input state', () => {
    const s = deepFreeze(createGame({ playerCount: 4, wallsPerPlayer: 3, firstPlayer: 0 }));
    const snapshot = JSON.stringify(s);
    const a = applyAction(s, move(7, 4));
    const b = applyAction(s, { type: 'wall', wall: h(3, 3) });
    const c = applyAction(s, move(0, 0));
    expect(a.ok && b.ok && !c.ok).toBe(true);
    expect(JSON.stringify(s)).toBe(snapshot);
    getValidMoves(s);
    shortestPathLength(s, 2);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('keeps earlier states usable as an undo stack', () => {
    const s0 = deepFreeze(createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 }));
    const s1 = deepFreeze(play(s0, { type: 'wall', wall: v(3, 3) }));
    const s2 = play(s1, move(1, 4));
    expect(s0.walls).toHaveLength(0);
    expect(s1.walls).toHaveLength(1);
    expect(s1.players[1]?.position).toEqual(pos(0, 4));
    expect(s2.players[1]?.position).toEqual(pos(1, 4));
    expect(s2.walls).not.toBe(s0.walls);
  });

  it('copies the wall instead of sharing the caller object', () => {
    const w = h(2, 2);
    const s = play(createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 }), { type: 'wall', wall: w });
    expect(s.walls[0]).toEqual(w);
    expect(s.walls[0]).not.toBe(w);
  });
});

describe('shortestPathLength', () => {
  it('is the straight distance on an open board', () => {
    const s = createGame({ playerCount: 4, wallsPerPlayer: 10, firstPlayer: 0 });
    expect([0, 1, 2, 3].map((i) => shortestPathLength(s, i))).toEqual([8, 8, 8, 8]);
  });

  it('is 0 on the goal edge', () => {
    const s = makeState([{ at: pos(0, 3) }, { at: pos(8, 3) }]);
    expect(shortestPathLength(s, 0)).toBe(0);
    expect(shortestPathLength(s, 1)).toBe(0);
  });

  it('ignores pawns', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(7, 4) }]);
    expect(shortestPathLength(s, 0)).toBe(8);
  });

  it('detours around walls', () => {
    // Top player at (0,4) with a wall below cols 3-4 and 5-6: best is via col 2 or col 7 (+2 sideways).
    const s = makeState([{ at: pos(8, 0) }, { at: pos(0, 4) }], { walls: [h(0, 3), h(0, 5)] });
    expect(shortestPathLength(s, 1)).toBe(10);
  });

  it('accepts a hypothetical wall list and returns null when walled off', () => {
    const sealed = [h(0, 0), h(0, 2), h(0, 4), h(0, 6), v(0, 7)];
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }]);
    expect(shortestPathLength(s, 1, sealed)).toBeNull();
    expect(shortestPathLength(s, 1)).toBe(8);
  });

  it('returns null for an unknown player', () => {
    expect(shortestPathLength(createGame({ playerCount: 2, wallsPerPlayer: 1, firstPlayer: 0 }), 5)).toBeNull();
  });
});

describe('createGame sanitises bad config', () => {
  it('maps non-finite / fractional / negative firstPlayer to a valid index', () => {
    for (const [fp, want] of [[NaN, 0], [Infinity, 0], [-Infinity, 0], [1.9, 1], [-1, 1], [5, 1]] as const) {
      expect(createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: fp }).turn, String(fp)).toBe(want);
    }
  });

  it('clamps wallsPerPlayer to a whole number >= 0 (NaN/Infinity -> 0)', () => {
    for (const [w, want] of [[NaN, 0], [Infinity, 0], [-3, 0], [4.7, 4], [10, 10]] as const) {
      const g = createGame({ playerCount: 4, wallsPerPlayer: w, firstPlayer: 0 });
      expect(g.players.every((p) => p.wallsLeft === want), String(w)).toBe(true);
    }
  });

  it('a player with zero walls cannot build', () => {
    const g = createGame({ playerCount: 2, wallsPerPlayer: NaN, firstPlayer: 0 });
    expect(checkWall(g, h(3, 3))).toMatchObject({ ok: false, reason: 'no-walls-left' });
  });
});

describe('checkWall with a corrupted wall count', () => {
  it('treats a NaN wallsLeft as no walls left', () => {
    const g = createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 });
    const bad: GameState = { ...g, players: g.players.map((p) => ({ ...p, wallsLeft: NaN })) };
    expect(checkWall(bad, h(3, 3))).toMatchObject({ ok: false, reason: 'no-walls-left' });
  });
});
