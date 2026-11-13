import type { Orientation } from '../engine/types';

export const undoIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

export function wallDirectionIcon(o: Orientation): string {
  return o === 'h'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="9" width="20" height="6" rx="2" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="20" rx="2" fill="currentColor"/></svg>';
}
