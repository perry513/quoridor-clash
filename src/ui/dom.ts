/** Small DOM helpers shared by the UI modules. */

/** querySelector that throws when the element is missing (markup lives in index.html). */
export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Quoridor Clash: missing element "${selector}"`);
  return el;
}

export function $$<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for safe use inside HTML/SVG markup strings. */
export function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

export function setPressed(el: Element, pressed: boolean): void {
  el.setAttribute('aria-pressed', String(pressed));
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Plural helper: plural(3, 'wall') -> "3 walls". */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Stable per-content animation offset (seconds, negative) so blinks and bobs
 * of different heroes do not happen in sync. Derived from the id, so it needs
 * no registry edits when new heroes are added.
 */
export function staggerDelay(id: string, period: number): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `${(-((h % 1000) / 1000) * period).toFixed(2)}s`;
}

/** Inline style string with the per-hero animation stagger custom properties. */
export function heroAnimVars(id: string): string {
  return `--blink-delay:${staggerDelay(id, 4.6)};--bob-delay:${staggerDelay(id + '#', 2.6)}`;
}
