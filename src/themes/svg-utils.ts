/** Small helpers shared by content files (walls, boards) and the renderers. */
import type { BoardDecorationContext } from './types';

/** Five-pointed star polygon centred on (cx, cy). */
export function star(cx: number, cy: number, r: number, fill: string): string {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1));
  }
  return `<polygon points="${p.join(' ')}" fill="${fill}"/>`;
}

/** Deterministic Park-Miller random generator in (0,1). */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Number formatted with one decimal (keeps markup short and stable). */
export const f1 = (n: number): string => n.toFixed(1);

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a string for use inside an XML attribute or text node. */
export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch] ?? ch);
}

/**
 * Scatter `count` points over the frame band (same distribution as the prototype)
 * and let `draw` turn each into markup. `k` is an extra random in [0,1).
 */
export function scatterOnFrame(
  ctx: BoardDecorationContext,
  count: number,
  draw: (x: number, y: number, k: number, i: number) => string,
): string {
  const { size: S, frame: P, random } = ctx;
  let s = '';
  for (let i = 0; i < count; i++) {
    const side = Math.floor(random() * 4);
    const t = 22 + random() * (S - 44);
    const d = 6 + random() * (P - 21);
    const [x, y] = side === 0 ? [t, d] : side === 1 ? [t, S - d] : side === 2 ? [d, t] : [S - d, t];
    const k = random();
    s += draw(x, y, k, i);
  }
  return s;
}
