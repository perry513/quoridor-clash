/**
 * Pure string renderers that turn content definitions into SVG markup.
 * All gradients/filters referenced here live in the single hidden <defs>
 * produced by allDefsMarkup(), injected once at startup.
 */
import { BOARD_SIZE, type Wall } from '../engine/types';
import { boardThemes, heroes, wallStyles } from './registry';
import { PORTRAIT_CLIP_ID, SHARED_DEFS } from './shared-defs';
import { escapeXml, seededRandom } from './svg-utils';
import type { BoardTheme, HeroDefinition, WallStyle } from './types';

export interface BoardGeometry {
  /** Cell edge length. */
  cell: number;
  /** Gap (groove) between cells, where walls sit. */
  gap: number;
  /** Width of the frame band around the playing area. */
  frame: number;
}

/** Geometry of the main 9x9 board. viewBox size = 2*frame + 9*cell + 8*gap = 712. */
export const BOARD_GEOMETRY: Readonly<BoardGeometry> = Object.freeze({ cell: 60, gap: 14, frame: 30 });

/** Geometry used by the small 3x3 previews on the setup screen. */
export const MINI_GEOMETRY: Readonly<BoardGeometry> = Object.freeze({ cell: 60, gap: 14, frame: 18 });

export interface Point {
  x: number;
  y: number;
}

/** Full board size (SVG units) for `cells` cells per side. */
export function boardPixelSize(cells: number = BOARD_SIZE, geo: BoardGeometry = BOARD_GEOMETRY): number {
  return 2 * geo.frame + cells * geo.cell + (cells - 1) * geo.gap;
}

/** Top-left corner of a cell. */
export function cellPosition(row: number, col: number, geo: BoardGeometry = BOARD_GEOMETRY): Point {
  const step = geo.cell + geo.gap;
  return { x: geo.frame + col * step, y: geo.frame + row * step };
}

/** Centre of a cell. */
export function cellCenter(row: number, col: number, geo: BoardGeometry = BOARD_GEOMETRY): Point {
  const p = cellPosition(row, col, geo);
  return { x: p.x + geo.cell / 2, y: p.y + geo.cell / 2 };
}

const cls = (...names: (string | undefined | false)[]): string => escapeXml(names.filter(Boolean).join(' '));

/* ------------------------------------------------------------------ defs */

let defsCache: string | undefined;

/**
 * Inner markup for ONE hidden `<svg><defs>…</defs></svg>`: shared defs plus every
 * hero, wall style and board theme defs. Inject once at startup.
 */
export function allDefsMarkup(): string {
  if (defsCache === undefined) {
    const parts = [SHARED_DEFS];
    for (const h of heroes) parts.push(h.portrait.defs ?? '', h.figure?.defs ?? '');
    for (const w of wallStyles) parts.push(w.defs ?? '');
    for (const b of boardThemes) parts.push(b.defs ?? '');
    defsCache = parts.map((p) => p.trim()).filter(Boolean).join('\n');
  }
  return defsCache;
}

/* ---------------------------------------------------------------- heroes */

/** Portrait content for a 0 0 100 100 box: clipped circle with hero colour backdrop. */
export function portraitMarkup(hero: HeroDefinition): string {
  return (
    `<g clip-path="url(#${PORTRAIT_CLIP_ID})">` +
    `<rect width="100" height="100" fill="${hero.color}"/>` +
    `<rect width="100" height="100" fill="url(#sh-bd-light)"/>` +
    `<rect width="100" height="100" fill="url(#sh-bd-dark)"/>` +
    hero.portrait.markup +
    `</g>`
  );
}

/** Round portrait as a standalone `<svg viewBox="0 0 100 100">`. */
export function portraitSvg(hero: HeroDefinition, className?: string): string {
  return (
    `<svg viewBox="0 0 100 100" class="${cls('portrait', `portrait-${hero.id}`, className)}" aria-hidden="true" focusable="false">` +
    portraitMarkup(hero) +
    `</svg>`
  );
}

/**
 * Figure for heroes without full-body art: the round portrait as a token with a
 * white rim, on a peg and base disc in the hero colour. Uses the same class hooks
 * as real figures so every hero animates the same way.
 */
export function fallbackFigureMarkup(hero: HeroDefinition): string {
  const c = hero.color;
  return (
    `<ellipse class="hero-shadow" cx="50" cy="121" rx="34.5" ry="6.5" fill="#12082a" opacity=".5" filter="url(#sh-blur)"/>` +
    `<g class="hero-figure">` +
    // base disc
    `<path d="M20 114.5 L20 118.5 A30 7 0 0 0 80 118.5 L80 114.5Z" fill="${c}"/>` +
    `<path d="M20 114.5 L20 118.5 A30 7 0 0 0 80 118.5 L80 114.5Z" fill="url(#sh-base-shade)"/>` +
    `<ellipse cx="50" cy="114.5" rx="30" ry="7" fill="${c}"/>` +
    `<ellipse cx="50" cy="114.5" rx="30" ry="7" fill="url(#sh-base-top)"/>` +
    `<path d="M21.5 112.7 A28.5 6 0 0 1 60 108.8" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/>` +
    `<ellipse cx="50" cy="114" rx="15" ry="3.6" fill="url(#sh-ao)"/>` +
    // peg
    `<path d="M41 92 L41 113 Q50 116.5 59 113 L59 92Z" fill="${c}"/>` +
    `<path d="M41 92 L41 113 Q50 116.5 59 113 L59 92Z" fill="url(#sh-base-shade)"/>` +
    // token
    `<circle cx="50" cy="63" r="38" fill="#12082a" opacity=".25"/>` +
    `<circle cx="50" cy="62" r="37.5" fill="#ffffff"/>` +
    `<g transform="translate(16 28) scale(.68)">${portraitMarkup(hero)}</g>` +
    `<path d="M24 46 Q32 30 48 26" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>` +
    `<g class="hero-eyes"></g>` +
    `</g>`
  );
}

/** Hero piece as `<svg viewBox="0 0 100 130" class="hero …">` (full figure or fallback token). */
export function heroFigureSvg(hero: HeroDefinition, className?: string): string {
  const inner = hero.figure ? hero.figure.markup : fallbackFigureMarkup(hero);
  const kind = hero.figure ? 'hero-full' : 'hero-token';
  return (
    `<svg viewBox="0 0 100 130" class="${cls('hero', `hero-${hero.id}`, kind, className)}" overflow="visible" aria-hidden="true" focusable="false">` +
    inner +
    `</svg>`
  );
}

/* ----------------------------------------------------------------- board */

export interface BoardBackgroundOptions {
  /** Cells per side (default 9). */
  size?: number;
  geometry?: BoardGeometry;
  /** Draw the theme's frame decorations (default true). */
  decorate?: boolean;
}

/** Board fragment (no <svg> wrapper): frame, decorations, groove well and 3D cells. */
export function boardBackgroundSvg(theme: BoardTheme, opts: BoardBackgroundOptions = {}): string {
  const n = opts.size ?? BOARD_SIZE;
  const g = opts.geometry ?? BOARD_GEOMETRY;
  const S = boardPixelSize(n, g);
  const inner = S - 2 * g.frame;
  let s = `<rect x="1.5" y="1.5" width="${S - 3}" height="${S - 3}" rx="${Math.round(g.frame * 0.85)}" fill="${theme.frame}" stroke="${theme.frameEdge}" stroke-width="3"/>`;
  if ((opts.decorate ?? true) && theme.decorate) {
    s += theme.decorate({ size: S, frame: g.frame, random: seededRandom(11) });
  }
  s += `<rect x="${g.frame - 6}" y="${g.frame - 6}" width="${inner + 12}" height="${inner + 12}" rx="12" fill="${theme.groove}"/>`;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const { x, y } = cellPosition(r, c, g);
      s += `<rect x="${x}" y="${y}" width="${g.cell}" height="${g.cell}" rx="9" fill="${theme.cellEdge}"/>`;
      s += `<rect x="${x}" y="${y}" width="${g.cell}" height="${g.cell - 4}" rx="9" fill="${(r + c) % 2 ? theme.cellB : theme.cellA}"/>`;
    }
  }
  return s;
}

/* ----------------------------------------------------------------- walls */

export interface WallSvgOptions {
  geometry?: BoardGeometry;
  className?: string;
  /** Red overlay (illegal ghost preview). */
  invalid?: boolean;
}

/** Wall body length and thickness for a geometry. */
export function wallSize(geo: BoardGeometry = BOARD_GEOMETRY): { length: number; thickness: number } {
  return { length: 2 * geo.cell + geo.gap - 6, thickness: geo.gap + 4 };
}

/** Wall fragment: drop shadow + style body (rotated for vertical walls) + optional invalid overlay. */
export function wallSvg(style: WallStyle, wall: Wall, opts: WallSvgOptions = {}): string {
  const g = opts.geometry ?? BOARD_GEOMETRY;
  const { length: L, thickness: T } = wallSize(g);
  const step = g.cell + g.gap;
  let shadow: string;
  let transform: string;
  if (wall.orientation === 'h') {
    const x = g.frame + wall.col * step + 3;
    const y = g.frame + wall.row * step + g.cell - 2;
    shadow = `<rect x="${x}" y="${y + 3}" width="${L}" height="${T}" rx="4" fill="rgba(0,0,0,.3)"/>`;
    transform = `translate(${x},${y})`;
  } else {
    const x = g.frame + wall.col * step + g.cell - 2;
    const y = g.frame + wall.row * step + 3;
    shadow = `<rect x="${x}" y="${y + 3}" width="${T}" height="${L}" rx="4" fill="rgba(0,0,0,.3)"/>`;
    transform = `translate(${x + T},${y}) rotate(90)`;
  }
  const overlay = opts.invalid ? `<rect width="${L}" height="${T}" rx="3" fill="#ff3b3b" opacity=".6"/>` : '';
  const classes = cls('wall', `wall-${style.id}`, opts.invalid && 'wall-invalid', opts.className);
  return `<g class="${classes}">${shadow}<g transform="${transform}">${style.render(L, T)}${overlay}</g></g>`;
}

/** 3x3 preview (`<svg>`) of a board theme with one horizontal and one vertical wall. */
export function miniBoardSvg(theme: BoardTheme, wallStyle: WallStyle): string {
  const g = MINI_GEOMETRY;
  const S = boardPixelSize(3, g);
  return (
    `<svg viewBox="0 0 ${S} ${S}" class="mini-board" aria-hidden="true" focusable="false">` +
    boardBackgroundSvg(theme, { size: 3, geometry: g, decorate: false }) +
    wallSvg(wallStyle, { orientation: 'h', row: 0, col: 0 }, { geometry: g }) +
    wallSvg(wallStyle, { orientation: 'v', row: 1, col: 1 }, { geometry: g }) +
    `</svg>`
  );
}
