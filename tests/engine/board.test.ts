import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, goalReached, isMoveBlocked, sidesFor, startPosition } from '../../src/engine';
import type { Side } from '../../src/engine';
import { h, pos, v } from './helpers';

const N = BOARD_SIZE;

describe('sides and start positions', () => {
  it('uses bottom/top for 2 players', () => {
    expect(sidesFor(2)).toEqual(['bottom', 'top']);
  });
  it('uses bottom/left/top/right turn order for 4 players', () => {
    expect(sidesFor(4)).toEqual(['bottom', 'left', 'top', 'right']);
  });
  it.each<[Side, number, number]>([
    ['bottom', 8, 4],
    ['top', 0, 4],
    ['left', 4, 0],
    ['right', 4, 8],
  ])('%s starts at (%i,%i)', (side, row, col) => {
    expect(startPosition(side)).toEqual({ row, col });
  });
  it('centres start positions on other board sizes', () => {
    expect(startPosition('bottom', 5)).toEqual({ row: 4, col: 2 });
    expect(startPosition('right', 5)).toEqual({ row: 2, col: 4 });
  });
});

describe('goalReached', () => {
  const p = (side: Side, row: number, col: number) => ({ side, position: pos(row, col), wallsLeft: 0, moves: 0 });
  it('bottom wins on row 0', () => {
    expect(goalReached(p('bottom', 0, 3), N)).toBe(true);
    expect(goalReached(p('bottom', 1, 3), N)).toBe(false);
  });
  it('top wins on the last row', () => {
    expect(goalReached(p('top', 8, 0), N)).toBe(true);
    expect(goalReached(p('top', 0, 4), N)).toBe(false);
  });
  it('left wins on the last column', () => {
    expect(goalReached(p('left', 2, 8), N)).toBe(true);
    expect(goalReached(p('left', 2, 7), N)).toBe(false);
  });
  it('right wins on column 0', () => {
    expect(goalReached(p('right', 6, 0), N)).toBe(true);
    expect(goalReached(p('right', 6, 1), N)).toBe(false);
  });
});

describe('isMoveBlocked', () => {
  it('blocks stepping off every edge', () => {
    expect(isMoveBlocked([], N, pos(0, 4), -1, 0)).toBe(true);
    expect(isMoveBlocked([], N, pos(8, 4), 1, 0)).toBe(true);
    expect(isMoveBlocked([], N, pos(4, 0), 0, -1)).toBe(true);
    expect(isMoveBlocked([], N, pos(4, 8), 0, 1)).toBe(true);
    expect(isMoveBlocked([], N, pos(4, 4), -1, 0)).toBe(false);
  });

  it('rejects non-unit steps', () => {
    expect(isMoveBlocked([], N, pos(4, 4), 1, 1)).toBe(true);
    expect(isMoveBlocked([], N, pos(4, 4), 0, 0)).toBe(true);
  });

  describe('horizontal wall h(3,3) covers cols 3 and 4 between rows 3 and 4', () => {
    const walls = [h(3, 3)];
    it.each([3, 4])('blocks down from (3,%i) and up from (4,%i)', (col) => {
      expect(isMoveBlocked(walls, N, pos(3, col), 1, 0)).toBe(true);
      expect(isMoveBlocked(walls, N, pos(4, col), -1, 0)).toBe(true);
    });
    it.each([2, 5])('does not block column %i', (col) => {
      expect(isMoveBlocked(walls, N, pos(3, col), 1, 0)).toBe(false);
      expect(isMoveBlocked(walls, N, pos(4, col), -1, 0)).toBe(false);
    });
    it('does not block sideways steps', () => {
      expect(isMoveBlocked(walls, N, pos(3, 3), 0, 1)).toBe(false);
      expect(isMoveBlocked(walls, N, pos(4, 4), 0, -1)).toBe(false);
    });
  });

  describe('vertical wall v(3,3) covers rows 3 and 4 between cols 3 and 4', () => {
    const walls = [v(3, 3)];
    it.each([3, 4])('blocks right from (%i,3) and left from (%i,4)', (row) => {
      expect(isMoveBlocked(walls, N, pos(row, 3), 0, 1)).toBe(true);
      expect(isMoveBlocked(walls, N, pos(row, 4), 0, -1)).toBe(true);
    });
    it.each([2, 5])('does not block row %i', (row) => {
      expect(isMoveBlocked(walls, N, pos(row, 3), 0, 1)).toBe(false);
      expect(isMoveBlocked(walls, N, pos(row, 4), 0, -1)).toBe(false);
    });
    it('does not block vertical steps', () => {
      expect(isMoveBlocked(walls, N, pos(3, 3), 1, 0)).toBe(false);
      expect(isMoveBlocked(walls, N, pos(4, 4), -1, 0)).toBe(false);
    });
  });
});
