/**
 * Kid-friendly text for rejected actions. Kept apart from the rules so the
 * wording can change (or be translated) without touching game logic.
 */
import type { WallRejection } from './types';

export const MESSAGES = {
  noWallsLeft: 'No walls left. Move your hero instead.',
  outOfBounds: 'Walls go in the gaps inside the board.',
  overlap: 'A wall is already in the way there. Try another gap.',
  trapped: (name: string): string => `That would trap ${name}. Everyone needs a way to their goal.`,
  badMove: 'Pick one of the glowing squares.',
  gameOver: 'The game is over. Start a new one to play again!',
  skipTurn: (name: string): string => `${name} is boxed in and skips a turn.`,
} as const;

export function describeWallRejection(r: WallRejection, nameOf: (i: number) => string): string {
  switch (r.reason) {
    case 'no-walls-left':
      return MESSAGES.noWallsLeft;
    case 'out-of-bounds':
      return MESSAGES.outOfBounds;
    case 'overlap':
      return MESSAGES.overlap;
    case 'blocks-path':
      return MESSAGES.trapped(nameOf(r.trappedPlayer));
  }
}
