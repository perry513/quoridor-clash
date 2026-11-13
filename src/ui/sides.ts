import type { Side } from '../engine/types';

/** Player-facing words for each starting side. */
export const SIDE_TEXT: Record<Side, { start: string; goal: string }> = {
  bottom: { start: 'Starts at the bottom', goal: 'top edge' },
  top: { start: 'Starts at the top', goal: 'bottom edge' },
  left: { start: 'Starts on the left', goal: 'right edge' },
  right: { start: 'Starts on the right', goal: 'left edge' },
};
