import { describe, expect, it } from 'vitest';
import { applyAction, checkWall, createGame, describeWallRejection, hasPathToGoal } from '../../src/engine';
import type { WallRejection } from '../../src/engine';
import { h, makeState, pos, v } from './helpers';

const fresh = () => createGame({ playerCount: 2, wallsPerPlayer: 10, firstPlayer: 0 });

describe('wall bounds', () => {
  it('accepts every corner slot', () => {
    for (const w of [h(0, 0), h(7, 7), v(0, 7), v(7, 0)]) expect(checkWall(fresh(), w)).toEqual({ ok: true });
  });
  it.each([h(-1, 0), h(0, -1), h(8, 0), h(0, 8), v(8, 3), v(3, 8), h(1.5, 2)])(
    'rejects out-of-bounds wall %o',
    (w) => {
      expect(checkWall(fresh(), w)).toEqual({ ok: false, reason: 'out-of-bounds' });
    },
  );
});

describe('overlap and crossing', () => {
  const base = (walls = [h(4, 4)]) => makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls });
  it('rejects the identical wall', () => {
    expect(checkWall(base(), h(4, 4))).toEqual({ ok: false, reason: 'overlap' });
  });
  it('rejects a crossing wall in the same slot', () => {
    expect(checkWall(base(), v(4, 4))).toEqual({ ok: false, reason: 'overlap' });
    expect(checkWall(base([v(2, 2)]), h(2, 2))).toEqual({ ok: false, reason: 'overlap' });
  });
  it('rejects half-overlapping horizontal walls', () => {
    expect(checkWall(base(), h(4, 3))).toEqual({ ok: false, reason: 'overlap' });
    expect(checkWall(base(), h(4, 5))).toEqual({ ok: false, reason: 'overlap' });
  });
  it('rejects half-overlapping vertical walls', () => {
    const s = base([v(4, 4)]);
    expect(checkWall(s, v(3, 4))).toEqual({ ok: false, reason: 'overlap' });
    expect(checkWall(s, v(5, 4))).toEqual({ ok: false, reason: 'overlap' });
  });
  it('allows touching end-to-end and neighbouring walls', () => {
    const s = base();
    expect(checkWall(s, h(4, 2))).toEqual({ ok: true });
    expect(checkWall(s, h(4, 6))).toEqual({ ok: true });
    expect(checkWall(s, h(3, 4))).toEqual({ ok: true });
    expect(checkWall(s, v(4, 3))).toEqual({ ok: true });
    expect(checkWall(s, v(3, 4))).toEqual({ ok: true });
    expect(checkWall(s, v(5, 4))).toEqual({ ok: true });
  });
  it('does not treat a vertical half-overlap as horizontal', () => {
    const s = base([v(4, 4)]);
    expect(checkWall(s, h(4, 3))).toEqual({ ok: true });
    expect(checkWall(s, h(4, 5))).toEqual({ ok: true });
  });
});

describe('path blocking', () => {
  // Row-0 line of walls leaves only the gap below (0,8).
  const almostSealed = [h(0, 0), h(0, 2), h(0, 4), h(0, 6)];

  it('rejects a wall that would trap the OTHER player', () => {
    // Top player (index 1) is at (0,4); sealing below row 0 traps them. Player 0 is building.
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls: almostSealed, turn: 0 });
    expect(checkWall(s, v(0, 7))).toEqual({ ok: false, reason: 'blocks-path', trappedPlayer: 1 });
  });

  it('rejects a wall that would trap the builder', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls: almostSealed, turn: 1 });
    expect(checkWall(s, v(0, 7))).toEqual({ ok: false, reason: 'blocks-path', trappedPlayer: 1 });
  });

  it('reports the lowest index when several players would be trapped', () => {
    // Pocket (7,0),(7,1),(8,0),(8,1) is closed above by h(6,0); v(7,1) would close its right side,
    // trapping both player 0 (bottom) and player 1 (left) inside.
    const s = makeState(
      [
        { at: pos(8, 0), side: 'bottom' },
        { at: pos(7, 1), side: 'left' },
        { at: pos(0, 4), side: 'top' },
        { at: pos(4, 8), side: 'right' },
      ],
      { walls: [h(6, 0)] },
    );
    expect(checkWall(s, v(7, 1))).toEqual({ ok: false, reason: 'blocks-path', trappedPlayer: 0 });
  });

  it('allows walls that only lengthen the path', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls: [h(0, 0), h(0, 2), h(0, 4)] });
    expect(checkWall(s, v(0, 7))).toEqual({ ok: true });
  });

  it('ignores pawns when checking paths', () => {
    // A pawn sitting in the only gap does not count as a block.
    const s = makeState([{ at: pos(1, 8) }, { at: pos(0, 4) }], { walls: almostSealed });
    expect(hasPathToGoal(s, 1)).toBe(true);
  });

  it('hasPathToGoal accepts an explicit wall list', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls: almostSealed });
    expect(hasPathToGoal(s, 1)).toBe(true);
    expect(hasPathToGoal(s, 1, [...almostSealed, v(0, 7)])).toBe(false);
  });
});

describe('wall supply', () => {
  it('decrements the builder\'s walls only', () => {
    const r = applyAction(fresh(), { type: 'wall', wall: h(4, 4) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players[0]?.wallsLeft).toBe(9);
    expect(r.state.players[1]?.wallsLeft).toBe(10);
    expect(r.state.walls).toEqual([h(4, 4)]);
    expect(r.state.turn).toBe(1);
  });

  it('rejects building with no walls left', () => {
    const s = makeState([{ at: pos(8, 4), wallsLeft: 0 }, { at: pos(0, 4) }]);
    expect(checkWall(s, h(4, 4))).toEqual({ ok: false, reason: 'no-walls-left' });
    const r = applyAction(s, { type: 'wall', wall: h(4, 4) });
    expect(r).toEqual({ ok: false, error: 'No walls left. Move your hero instead.' });
  });

  it('checks the supply before bounds', () => {
    const s = makeState([{ at: pos(8, 4), wallsLeft: 0 }, { at: pos(0, 4) }]);
    expect(checkWall(s, h(-1, 0))).toEqual({ ok: false, reason: 'no-walls-left' });
  });
});

describe('describeWallRejection', () => {
  const name = (i: number) => ['Pip', 'Rosa'][i] ?? '?';
  it.each<[WallRejection, string]>([
    [{ ok: false, reason: 'no-walls-left' }, 'No walls left. Move your hero instead.'],
    [{ ok: false, reason: 'out-of-bounds' }, 'Walls go in the gaps inside the board.'],
    [{ ok: false, reason: 'overlap' }, 'A wall is already in the way there. Try another gap.'],
    [{ ok: false, reason: 'blocks-path', trappedPlayer: 1 }, 'That would trap Rosa. Everyone needs a way to their goal.'],
  ])('describes %o', (r, msg) => {
    expect(describeWallRejection(r, name)).toBe(msg);
  });

  it('applyAction uses nameOf for trap messages', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }], { walls: [h(0, 0), h(0, 2), h(0, 4), h(0, 6)] });
    const r = applyAction(s, { type: 'wall', wall: v(0, 7) }, name);
    expect(r).toEqual({ ok: false, error: 'That would trap Rosa. Everyone needs a way to their goal.' });
    const r2 = applyAction(s, { type: 'wall', wall: v(0, 7) });
    expect(r2).toEqual({ ok: false, error: 'That would trap Player 2. Everyone needs a way to their goal.' });
  });
});
