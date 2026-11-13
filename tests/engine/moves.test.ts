import { describe, expect, it } from 'vitest';
import { getValidMoves } from '../../src/engine';
import { h, keys, makeState, pos, v } from './helpers';

describe('orthogonal moves', () => {
  it('offers four steps in open space', () => {
    const s = makeState([{ at: pos(4, 4) }, { at: pos(0, 0) }]);
    expect(keys(getValidMoves(s))).toEqual(['3,4', '4,3', '4,5', '5,4']);
  });

  it('offers start moves for the opening position', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 4) }]);
    expect(keys(getValidMoves(s, 0))).toEqual(['7,4', '8,3', '8,5']);
    expect(keys(getValidMoves(s, 1))).toEqual(['0,3', '0,5', '1,4']);
  });

  it('stops at board edges and corners', () => {
    const s = makeState([{ at: pos(0, 0) }, { at: pos(8, 8) }]);
    expect(keys(getValidMoves(s, 0))).toEqual(['0,1', '1,0']);
    expect(keys(getValidMoves(s, 1))).toEqual(['7,8', '8,7']);
  });

  it('defaults to the current player', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 0) }], { turn: 1 });
    expect(keys(getValidMoves(s))).toEqual(['0,1', '1,0']);
  });

  it('returns nothing for an unknown player index', () => {
    const s = makeState([{ at: pos(8, 4) }, { at: pos(0, 0) }]);
    expect(getValidMoves(s, 7)).toEqual([]);
  });
});

describe('walls block moves', () => {
  const at = pos(4, 4);
  const other = { at: pos(0, 0) };
  it.each([
    ['up (left half of wall)', h(3, 4), '3,4'],
    ['up (right half of wall)', h(3, 3), '3,4'],
    ['down (left half)', h(4, 4), '5,4'],
    ['down (right half)', h(4, 3), '5,4'],
    ['left (top half)', v(4, 3), '4,3'],
    ['left (bottom half)', v(3, 3), '4,3'],
    ['right (top half)', v(4, 4), '4,5'],
    ['right (bottom half)', v(3, 4), '4,5'],
  ])('blocks %s', (_label, wall, blockedKey) => {
    const s = makeState([{ at }, other], { walls: [wall] });
    const got = keys(getValidMoves(s));
    expect(got).not.toContain(blockedKey);
    expect(got).toHaveLength(3);
  });

  it('can box a pawn in completely', () => {
    const s = makeState([{ at }, other], { walls: [h(3, 4), h(4, 3), v(3, 3), v(4, 4)] });
    expect(getValidMoves(s)).toEqual([]);
  });
});

describe('jumping', () => {
  it('jumps straight over an adjacent pawn', () => {
    const s = makeState([{ at: pos(4, 4) }, { at: pos(3, 4) }]);
    const got = keys(getValidMoves(s));
    expect(got).toContain('2,4');
    expect(got).not.toContain('3,4');
    expect(got).not.toContain('3,3');
    expect(got).not.toContain('3,5');
  });

  it.each([
    ['right', pos(4, 5), '4,6'],
    ['left', pos(4, 3), '4,2'],
    ['down', pos(5, 4), '6,4'],
  ])('jumps %s', (_d, other, target) => {
    const s = makeState([{ at: pos(4, 4) }, { at: other }]);
    expect(keys(getValidMoves(s))).toContain(target);
  });

  it('cannot jump through a wall in front of the pawn', () => {
    const s = makeState([{ at: pos(4, 4) }, { at: pos(3, 4) }], { walls: [h(3, 4)] });
    const got = keys(getValidMoves(s));
    expect(got).not.toContain('3,4');
    expect(got).not.toContain('2,4');
    expect(got).not.toContain('3,3');
  });

  it('side-steps diagonally when a wall is behind the pawn', () => {
    const s = makeState([{ at: pos(4, 4) }, { at: pos(3, 4) }], { walls: [h(2, 4)] });
    expect(keys(getValidMoves(s))).toEqual(['3,3', '3,5', '4,3', '4,5', '5,4']);
  });

  it('side-steps diagonally when the board edge is behind the pawn', () => {
    const s = makeState([{ at: pos(1, 4) }, { at: pos(0, 4) }]);
    expect(keys(getValidMoves(s))).toEqual(['0,3', '0,5', '1,3', '1,5', '2,4']);
  });

  it('side-steps at the edge for horizontal neighbours', () => {
    const s = makeState([{ at: pos(4, 7) }, { at: pos(4, 8) }]);
    expect(keys(getValidMoves(s))).toEqual(['3,7', '3,8', '4,6', '5,7', '5,8']);
  });

  it('only side-steps where no wall blocks the diagonal', () => {
    const s = makeState([{ at: pos(4, 4) }, { at: pos(3, 4) }], { walls: [h(2, 4), v(2, 4)] });
    const got = keys(getValidMoves(s));
    expect(got).toContain('3,3');
    expect(got).not.toContain('3,5');
  });

  it('side-steps when another pawn is behind (4 players)', () => {
    const s = makeState([{ at: pos(4, 4) }, { at: pos(3, 4) }, { at: pos(2, 4) }, { at: pos(8, 8) }]);
    expect(keys(getValidMoves(s))).toEqual(['3,3', '3,5', '4,3', '4,5', '5,4']);
  });

  it('never lands on a pawn when side-stepping', () => {
    const s = makeState([{ at: pos(4, 4) }, { at: pos(3, 4) }, { at: pos(2, 4) }, { at: pos(3, 5) }]);
    const got = keys(getValidMoves(s));
    expect(got).toContain('3,3');
    expect(got).not.toContain('3,5');
    expect(got).not.toContain('2,4');
    expect(got).not.toContain('4,4');
  });

  it('never returns a square holding any pawn, and has no duplicates', () => {
    const others = [pos(3, 4), pos(4, 3), pos(3, 3)];
    const s = makeState([{ at: pos(4, 4) }, ...others.map((at) => ({ at }))]);
    const moves = getValidMoves(s);
    const k = keys(moves);
    expect(new Set(k).size).toBe(k.length);
    for (const o of [...others, pos(4, 4)]) expect(k).not.toContain(`${o.row},${o.col}`);
  });

  it('deduplicates a square reachable by two side-steps', () => {
    // Pawns up and left, both with something behind: (3,3) is reachable from either.
    const s = makeState(
      [{ at: pos(4, 4) }, { at: pos(3, 4) }, { at: pos(4, 3) }, { at: pos(8, 8) }],
      { walls: [h(2, 4), v(4, 2)] },
    );
    const k = keys(getValidMoves(s));
    expect(k.filter((x) => x === '3,3')).toHaveLength(1);
    expect(k).toEqual(['3,3', '3,5', '4,5', '5,3', '5,4']);
  });
});
